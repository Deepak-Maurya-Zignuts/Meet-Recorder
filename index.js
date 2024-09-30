const express = require("express");
const { startRecording } = require("./meet");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set("view engine", "ejs");

app.get("/", async (req, res) => {
    res.render("index");
});

app.post("/startRecording", async (req, res) => {
    const meetingId = req.body.meetingId;
    const email = "abc@example.com";
    const password = "password";

    // ** Start Recording **
    const recording = await startRecording(meetingId, email, password);

    res.send({ recording });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
