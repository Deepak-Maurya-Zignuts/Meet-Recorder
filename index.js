const express = require("express");
const { startRecording } = require("./meet");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
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

    res.send({
        status: 200,
        success: true,
        message: "Meeting started successfully.",
    });

    try {
        await startRecording(meetingId, email, password);
    } catch (error) {
        console.error("Error starting recording:", error);
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
