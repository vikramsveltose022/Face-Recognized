const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const fileUpload = require("express-fileupload");
// const moment = require("moment-timezone");
const moment = require("moment");
// moment.tz.setDefault("Asia/Kolkata");
const multer = require("multer");
const { createCanvas, Canvas, Image, ImageData, loadImage } = require("canvas");
const canvas = require("canvas");
const fs = require("fs");
const compare = require("resemblejs").compare;
const faceapi = require("face-api.js");
const { promisify } = require("util");
const bodyParser = require("body-parser");
const { default: axios } = require("axios");
const readFileAsync = promisify(fs.readFile);
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const port = 5050;
app.use(cors());

app.get("/", (req, res) => {
  res.send("Hello World!");
});
const faceDetectionOptions = new faceapi.SsdMobilenetv1Options({
  minConfidence: 0.5,
});
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });
async function LoadModels() {
  // Load the models
  // __dirname gives the root directory of the server
  await faceapi.nets.faceRecognitionNet.loadFromDisk(__dirname + "/models");
  await faceapi.nets.faceLandmark68Net.loadFromDisk(__dirname + "/models");
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(__dirname + "/models");
}
LoadModels();

mongoose.connect(
  "mongodb+srv://anujeshdevelopersveltosest11:Anujesh1234@cluster0.vsjsevi.mongodb.net/dms?retryWrites=true&w=majority&appName=Cluster0"
).then(() => {
  console.log("DB Connected successfully");
}).catch(error => {
  console.log("ERROR connecting DB", error);
});

const userSchema = new mongoose.Schema(
  {
    database: {
      type: String
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    image: {
      type: String,
      required: true,
    },
    descriptions: {
      type: Array,
      required: true,
    },
    panNo: {
      type: String,
    },
    latitude: {
      type: String
    },
    longitude: {
      type: String
    },
    basicSalary: {
      type: String
    }
  },
  { timestamps: true });

const isValid = value => {
  {
    if (typeof value === "undefined" || value === null) return false;

    if (typeof value === "string" && value.trim().length === 0) return false;
  }
  return true;
};

const User = mongoose.model("markPresent", userSchema);

const attendanceSchema = new mongoose.Schema(
  {
    database: {
      type: String
    },
    name: {
      type: String
    },
    panNo: {
      type: String,
    },
    userId: {
      type: String,
    },
    inTimes: {
      type: [],
    },
    outTimes: {
      type: [],
    },
    date: {
      type: String,
    },
    status: {
      type: String,
      default: "Active",
    },
    attendanceStatus: {
      type: Boolean
    },
    dummyTime: {
      type: String
    },
    latitude: {
      type: String
    },
    longitude: {
      type: String
    },
    late: {
      type: String
    },
    early: {
      type: String
    }
  },
  { timestamps: true });

const Attendance = mongoose.model("employeeAttendance", attendanceSchema);

const LocationSchema = new mongoose.Schema({
  database: {
    type: String
  },
  userId: {
    type: String,
  },
  latitude: {
    type: String
  },
  longitude: {
    type: String
  },
  status: {
    type: String,
    default: "Active",
  }
},
  { timestamps: true });

const Location = mongoose.model("location", LocationSchema);

const ImageSchema = new mongoose.Schema({
  database: {
    type: String
  },
  name: {
    type: String,
  },
  time:{
    type:String
  },
  image: {
    type: String
  },
  descriptions: {
    type: Array
  },
  status: {
    type: String,
    default: "Active",
  }
},
  { timestamps: true });

const CheckImage = mongoose.model("checkImage", ImageSchema);

app.use(express.json());

// -------------------------------------------
app.post("/saved", async (req, res) => {
  const save = await Attendance.create(req.body)
  if (save) {
    res.send("success")
  }
})
app.get("/register-user-list/:database", async (req, res) => {
  try {
    const user = await User.find({ database: req.params.database }).sort({ sortorder: -1 })
    if (user.length > 0) {
      return res.status(200).json({ User: user, status: true })
    } else {
      return res.status(404).json({ message: "user not found", status: false })
    }
  }
  catch (err) {
    console.log(err)
    return res.status(500).json({ error: "Internal Server Error", status: false })
  }
})
app.post("/save-location", async (req, res) => {
  try {
    const user = await Location.findOne({ database: req.body.database })
    if (!user) {
      const save = await Location.create(req.body)
      if (save) {
        return res.status(200).json({ message: "saved successfull !", status: true })
      } else {
        return res.status(400).json({ message: "Bad Request", status: false })
      }
    } else {
      return res.status(400).json({ message: "already created", status: false })
    }
  } catch (err) {
    console.log(err)
    return res.status(500).json({ error: "Internal Server Error", status: false })
  }
})
app.get("/get/:id", async (req, res) => {
  const save = await User.findById(req.params.id)
  if (save) {
    res.status(200).json({ data: save })
  }
})
app.get("/checkImage", async (req, res) => {
  const save = await CheckImage.find()
  if (save.length > 0) {
    return res.status(200).json({ data: save, status: true })
  } else {
    return res.status(404).json({ message: "Not Found", status: false })
  }
})
app.put("/put/:id", async (req, res) => {
  console.log("called..")
  const save = await User.findById(req.params.id)
  if (save) {
    save.image = req.body.image;
    save.descriptions = req.body.descriptions
    await save.save()
    return res.status(200).json({ message: "success", status: true })
  }
  return res.status(404).json({ message: "not found", status: false })
})
// ----------------------------------------------
// update checkIn and checkout
app.put('/editTimes/:id', async (req, res) => {
  const { id } = req.params;
  const { inTimeIndex, inTime, outTimeIndex, outTime } = req.body;
  try {
    const user = await Attendance.findById(id);

    if (!user) {
      return res.status(404).json({message:"not found"});
    }

    if (inTimeIndex !== undefined || inTime !== undefined) {
      if (user.inTimes[inTimeIndex] !== undefined) {
        user.inTimes[inTimeIndex] = inTime;
      } else {
        return res.status(400).json({message:"'Invalid outTime index'",status:false});
      }
    }

    if (outTimeIndex !== undefined || outTime !== undefined) {
      if (user.outTimes[outTimeIndex] !== undefined) {
        user.outTimes[outTimeIndex] = outTime;
      } else {
        return res.status(400).json({message:"'Invalid outTime index'",status:false});
      }
    }
    await user.save();
    return res.status(200).json({User:user,message:"updated successfull!",status:true})
  } catch (err) {
    console.log(err)
    return res.status(500).json({error:"Internal Server Error",status:false});
  }
});

// check checkIn and checkOut time
async function checkTimes(data) {
  const res = await axios.get(`https://customer-node.rupioo.com/holiday/view-working/${data.database}`)
  if (res.status) {
    const time = data.time; // Time should be in 12-hour format with AM/PM indicator
    const fromTime = res.data.WorkingHours.fromTime;;
    const toTime = res.data.WorkingHours.toTime;;
    const lateByTime = res.data.WorkingHours.lateByTime;;
    const shortByTime = res.data.WorkingHours.shortByTime;;
    const [timePart, amPmPart] = time.split(' ');
    const [hours, minutes] = timePart.split(':').map(Number);
    let adjustedHours = hours;
    if (amPmPart.toLowerCase() === 'pm') {
      adjustedHours += 12;
    }
    const inputTimeObj = new Date(1970, 0, 1, adjustedHours, minutes, 0);
    const fromTimeObj = new Date(`1970-01-01T${fromTime}:00`);
    const toTimeObj = new Date(`1970-01-01T${toTime}:00`);
    const lateByTimeObj = new Date(`1970-01-01T${lateByTime}:00`);
    const shortByTimeObj = new Date(`1970-01-01T${shortByTime}:00`);

    if ((fromTimeObj <= inputTimeObj && inputTimeObj <= lateByTimeObj) ||
      (shortByTimeObj >= inputTimeObj && inputTimeObj >= toTimeObj)) {
      return true;
    }
    return false;
  }
}

const calculateAttendance = (attendanceData) => {
  const { inTimes, outTimes, date, status } = attendanceData;
  const minLength = Math.min(inTimes.length, outTimes.length);
  let totalWorkingHours = 0;
  let monthHours = 0
  let time = 0;
  for (let i = 0; i < minLength; i++) {
    const inTimeMs = new Date(`${date} ${inTimes[i]}`).getTime();
    const outTimeMs = new Date(`${date} ${outTimes[i]}`).getTime();
    const workingHoursMs = Math.max(0, outTimeMs - inTimeMs);
    const workingHours = workingHoursMs / (1000 * 60 * 60);
    totalWorkingHours += workingHours;
  }
  time = totalWorkingHours - 9;
  const overTime = (time > 0) ? time : 0
  const attendancePercentage = (totalWorkingHours / 9) * 100;
  monthHours = monthHours + totalWorkingHours;
  return {
    date,
    status,
    totalWorkingHours,
    attendancePercentage,
    monthHours,
    overTime
  };
};
app.get("/attendance-calculate/:database", async (req, res) => {
  try {
    let attendanceTotal = [];
    let totalMonthHours = 0;
    let totalHours = 0;
    let salary = 0;
    const attendances = await User.find({ database: req.params.database })
    if (attendances.length === 0) {
      return res.status(404).json({ message: "Non Found", status: false })
    }
    for (let pan of attendances) {
      const attendanced = await Attendance.find({ panNo: pan.panNo })
      if (attendanced.length > 0) {
        for (let id of attendanced) {
          // const res = await axios.get(`https://customer-node.rupioo.com/rule-creation//working-hours/${id.database}/${id.panNo}`)
          const result = await calculateAttendance(id);
          // if (res.status) {
          //   salary = res.data.hoursSalary * result.totalWorkingHours
          // }
          totalHours += result.monthHours
          attendanceTotal.push({ details: id, attendance: result, totalHours: totalHours })
        }
      }
    }
    attendanceTotal.forEach(item => {
      totalMonthHours += item.attendance.monthHours
    })
    return res.status(200).json({ attendanceTotal, totalMonthHours });
  }
  catch (err) {
    console.log(err);
  }
})

// app.get("/attendance-calculate-employee/:panNo", async (req, res) => {
//   try {
//     let attendanceTotal = [];
//     let totalMonthHours = 0;
//     let totalHours = 0;
//     const current = new Date()
//     console.log(current)
//     const attendanced = await Attendance.find({ panNo: req.params.panNo, date: current })
//     if (attendanced.length > 0) {
//       for (let id of attendanced) {
//         const result = await calculateAttendance(id);
//         totalHours += result.monthHours
//         attendanceTotal.push({ details: id, attendance: result, totalHours: totalHours })
//       }
//     }
//     attendanceTotal.forEach(item => {
//       totalMonthHours += item.attendance.monthHours
//     })
//     return res.status(200).json({ attendanceTotal, totalMonthHours });
//   }
//   catch (err) {
//     console.log(err);
//   }
// })

app.get("/attendance-calculate-employee/:panNo", async (req, res) => {
  try {
    let attendanceTotal = [];
    let totalMonthHours = 0;
    let totalHours = 0;
    let salary = 0;
    let totalOverTime = 0;
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const firstDayOfPreviousMonth = new Date(currentYear, currentMonth - 1, 1);
    const lastDayOfPreviousMonth = new Date(currentYear, currentMonth, 0);
    const formattedFirstDay = formatDate(firstDayOfPreviousMonth);
    const formattedLastDay = formatDate(lastDayOfPreviousMonth);
    const attendances = await Attendance.find({
      panNo: req.params.panNo,
      date: {
        $gte: formattedFirstDay,
        $lte: formattedLastDay,
      }
    });
    if (attendances.length > 0) {
      for (let attendance of attendances) {
        // const res = await axios.get(`https://customer-node.rupioo.com/rule-creation//working-hours/${attendance.database}/${attendance.panNo}`)
        const result = await calculateAttendance(attendance);
        // if (res.status) {
        //   salary = res.data.hoursSalary * result.totalWorkingHours
        // }
        totalHours += result.monthHours;
        attendanceTotal.push({ details: attendance, attendance: result, totalHours: totalHours });
      }
    }
    attendanceTotal.forEach(item => {
      totalMonthHours += item.attendance.monthHours;
      totalOverTime += item.attendance.overTime;
      // console.log(totalOverTime)
    });
    return res.status(200).json({ attendanceTotal, totalMonthHours, totalOverTime });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

// Helper function to format date in "YYYY-MM-DD" format
const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Zero-based index
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};



app.get("/attendance-employee/:panNo", async (req, res) => {
  try {
    const attendanced = await Attendance.find({ panNo: req.params.panNo })
    if (attendanced.length === 0) {
      return res.status(404).json({ message: "Non Found", status: false })
    }
    return res.status(200).json({ attendanced, status: true })
  }
  catch (err) {
    console.log(err);
  }
})

const attendance = async (use, data) => {
  try {
    let lateTime = "";
    let earlyTime = ""
    const res = await axios.get(`https://customer-node.rupioo.com/holiday/view-working/${use.database}`)
    if (res.status) {
      let inTime = res.data.WorkingHours.fromTime;
      let time = data.time.toString();
      let [inHours, inMinutes] = inTime.split(':').map(Number);
      let [timeHours, timeMinutes] = time.split(/:| /).slice(0, 2).map(Number);
      if (!time.includes('am') && !time.includes('pm')) {
        timeHours += 12;
      }
      let delayMinutes = (timeHours * 60 + timeMinutes) - (inHours * 60 + inMinutes);
      let delayHours = Math.floor(delayMinutes / 60);
      delayMinutes %= 60;
      if (delayMinutes > 0 || delayHours > 0) {
        lateTime = delayHours + ":" + delayMinutes + " minute"
        // console.log("Delay:", delayHours, "hours", delayMinutes, "minutes");
      }
      // -------------------------------------------------------------------------------

      let outTime = res.data.WorkingHours.toTime;
      let timeOut = data.time.toString();
      let [inHours1, inMinutes1] = outTime.split(':').map(Number);
      if (inHours1 > 12) {
        inHours1 = inHours1 - 12
      }
      let [timeHours1, timeMinutes1] = timeOut.split(/:| /).slice(0, 2).map(Number);
      if (!timeOut.includes('am') && !timeOut.includes('pm')) {
        timeHours1 += 12;
      }
      let earlyMinutes = (timeHours1 * 60 + timeMinutes1) - (inHours1 * 60 + inMinutes1);
      let earlyHours = Math.floor(earlyMinutes / 60);
      earlyMinutes %= 60;
      if (earlyMinutes < 0 || earlyHours < 0) {
        earlyTime = earlyHours + ":" + earlyMinutes + " minute"
        // console.log("Delay:", earlyMinutes, "hours", earlyHours, "minutes");
      }
    }
    const panNo = use.panNo;
    const name = use.name;
    const database = use.database;
    const currentDate = data.date; // moment().format("YYYY-MM-DD"); // "2024-02-24"
    const currentTime = data.time; // moment().format("HH:mm:ss");

    // const targetTime1 = "09:50:00 am";
    // const targetTime3 = "05:30:00 pm";
    // const currentTimeDate = new Date(`2024-01-01 ${currentTime}`);
    // const targetTimeDate1 = new Date(`2024-01-01 ${targetTime1}`);
    // const targetTimeDate3 = new Date(`2024-01-01 ${targetTime3}`);
    // const status1 = currentTimeDate > targetTimeDate1;
    // const status3 = currentTimeDate > targetTimeDate3;
    // console.log(status1);
    // console.log(status3);

    const attendanceEntry = await Attendance.findOne({
      panNo,
      date: currentDate,
    });
    // if (attendanceEntry) {
    //   // here write that code check time previous time if suppose 10:10pm previous time if under 10 minute come so not save this time
    // }
    if (!attendanceEntry) {
      const newAttendanceEntry = new Attendance({
        panNo,
        name,
        database,
        date: currentDate,
        inTimes: [currentTime],
        outTimes: [],
        late: lateTime
      });
      const first = await newAttendanceEntry.save();
      // console.log("fff " + first)
    } else {
      const lastDate = moment(attendanceEntry.date).format("YYYY-MM-DD");
      if (lastDate !== currentDate) {
        const newAttendanceEntry = new Attendance({
          panNo,
          name,
          database,
          date: currentDate,
          inTimes: [currentTime],
          outTimes: [],
          late: lateTime
        });
        const second = await newAttendanceEntry.save();
        // console.log("sesese " + second)
      } else {
        if (
          attendanceEntry.inTimes.length === attendanceEntry.outTimes.length
        ) {
          attendanceEntry.inTimes.push(currentTime);
        } else {
          attendanceEntry.early = earlyTime
          attendanceEntry.outTimes.push(currentTime);
        }
        const thr = await attendanceEntry.save();
        // console.log("same " + thr)
      }
    }
  } catch (error) {
    console.error(error);
  }
};

app.post("/register", upload.single("image"), async (req, res) => {
  const { name, panNo, database, latitude, longitude, basicSalary } = req.body;
  if (!isValid(name)) {
    return res.status(400).send({ status: false, msg: "BAD REQUEST, please provide name" });
  }
  if (!isValid(panNo)) {
    return res.status(401).send({ status: false, msg: "BAD REQUEST, please provide mobile" });
  }
  const registeredUser = await User.findOne({ panNo: panNo });
  if (registeredUser) {
    return res.status(404).send({
      status: false,
      message: `user with this number is already registered`,
    });
  }
  if (!req.file) {
    return res
      .status(405)
      .send({ status: false, msg: "BAD REQUEST, please provide image" });
  }

  const imageBuffer = req.file.buffer;
  const imageBase64 = `data:${req.file.mimetype};base64,${imageBuffer.toString(
    "base64"
  )}`;

  //console.log(imageBuffer);
  //console.log('file', req.file);

  const imageData = req.file.buffer; // Get image data buffer

  // Create a canvas from the image buffer
  const canvas = createCanvas();
  const ctx = canvas.getContext("2d");

  const img = await loadImage(imageData);
  //console.log('img', img);

  // Set the canvas dimensions to match the image dimensions
  canvas.width = img.width;
  canvas.height = img.height;
  // Copy the image buffer into the canvas
  ctx.drawImage(img, 0, 0);
  console.log("Image loaded successfully!");

  // continue with the face detection code here
  const detections = await faceapi
    .detectSingleFace(img)
    .withFaceLandmarks()
    .withFaceDescriptor();

  console.log("face detected");
  //console.log('detections.descriptor', detections.descriptor);

  const descriptions = [];
  descriptions.push(detections.descriptor);

  //console.log('descriptions');

  const newUser = new User({
    name,
    database,
    panNo,
    image: imageBase64,
    descriptions: descriptions,
    latitude,
    longitude,
    basicSalary
  });
  await newUser.save();

  res.status(201).send("User registered successfully!");
});

app.post("/login", upload.single("image"), async (req, res) => {
  try {
    const status = await checkTimes(req.body)
    if(!status){
      return res.status(400).json({message:"You are not within office in Time",status:false})
    }
    // const { latitude, longitude } = req.body;
    // const lati = latitude.toString().slice(0, 7)
    // const long = longitude.toString().slice(0, 7)
    if (!req.file) {
      return res.status(402).send({ status: false, msg: "BAD REQUEST, please provide image" });
    }
    const imageBuffer = req.file.buffer;
    const imageBase64 = `data:${req.file.mimetype};base64,${imageBuffer.toString(
      "base64"
    )}`;

    //console.log(imageBuffer);
    //console.log('file', req.file);

    const imageData = req.file.buffer; // Get image data buffer

    // Create a canvas from the image buffer
    const canvas = createCanvas();
    const ctx = canvas.getContext("2d");

    const img = await loadImage(imageData);
    //console.log('img', img);

    // Set the canvas dimensions to match the image dimensions
    canvas.width = img.width;
    canvas.height = img.height;
    // Copy the image buffer into the canvas
    ctx.drawImage(img, 0, 0);
    console.log("Image loaded successfully!");

    // continue with the face detection code here
    const detections = await faceapi
      .detectSingleFace(img)
      .withFaceLandmarks()
      .withFaceDescriptor();

    console.log("face detected");
    //console.log('detections.descriptor', detections.descriptor);

    const descriptions = [];
    descriptions.push(detections.descriptor);

    const newUser = new CheckImage({
      database: req.body.database,
      image: imageBase64,
      descriptions: descriptions,
      time:req.body.time
    });
    await newUser.save();


    const registeredUsers = await User.find({ database: req.body.database });

    if (!registeredUsers.length > 0) {
      return res.status(404).send("User not found.");
    }

    for (let registeredUser of registeredUsers) {
      const options = {
        returnEarlyThreshold: 100,
      };
      console.log("user exist");
      for (let i = 0; i < registeredUser.descriptions.length; i++) {
        registeredUser.descriptions[i] = new Float32Array(
          Object.values(registeredUser.descriptions[i])
        );
      }
      const faces = new faceapi.LabeledFaceDescriptors(
        registeredUser.panNo,
        registeredUser.descriptions
      );
      const faceMatcher = new faceapi.FaceMatcher(faces, 0.6);
      const img = await loadImage(req.file.buffer);
      let temp = faceapi.createCanvasFromMedia(img);
      const displaySize = { width: img.width, height: img.height };
      faceapi.matchDimensions(temp, displaySize);

      const detections = await faceapi
        .detectSingleFace(img)
        .withFaceLandmarks()
        .withFaceDescriptor();
      const misMatchPercentage = faceapi.euclideanDistance(
        detections.descriptor,
        registeredUser.descriptions[0]
      );
      console.log("misMatchPercentage", misMatchPercentage);

      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      const result = faceMatcher.findBestMatch(resizedDetections.descriptor);

      console.log("results", result);
      if (misMatchPercentage <= 0.5) {
        await attendance(registeredUser, req.body);
        console.log("success");
        return res.status(200).json({ registeredUser, time: req.body, message: "User logged in successfully!", status: true });
      } else {
        console.log("fail");
        // return res.status(404).json("User Not Found!");
      }
    }
    return res.status(404).json({ message: "User Not Found", status: false });
  } catch (error) {
    console.error("Error during comparison:", error);
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
