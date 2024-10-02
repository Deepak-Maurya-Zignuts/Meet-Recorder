const { executablePath } = require("puppeteer");
const fs = require("fs");
const puppeteerExtra = require("puppeteer-extra");
const stealthPlugin = require("puppeteer-extra-plugin-stealth");
const { launch, getStream } = require("puppeteer-stream");
const path = require("path");

const startRecording = async (meetingId, email, password) => {
    // ** sleep function
    const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

    // ** generate file name
    const generateFileName = () => {
        const timestamp = new Date().toISOString();
        return `google_meet_${timestamp}.webm`;
    };

    try {
        // ** browser launch
        const browser = await launch({
            headless: false,
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
            executablePath: executablePath(),
        });

        // ** override permissions
        const context = browser.defaultBrowserContext();
        await context.overridePermissions("https://meet.google.com/", [
            "microphone",
            "camera",
            "notifications",
        ]);

        const page = await context.newPage();

        // // **attaching logger to Puppeteer console event
        // page.on("console", (msg) => {
        //     console.log(`Puppeteer console log: ${msg.text()}`);
        // });

        // page.on("dialog", async (dialog) => {
        //     console.log(`Dialog detected: ${dialog.message()}`);
        //     await dialog.dismiss();
        // });

        // page.on("error", (error) => {
        //     console.log(`Page error: ${error.message}`, error);
        // });

        // page.on("pageerror", (error) => {
        //     console.log(`Page error: ${error.message}`, error);
        // });

        // page.on("requestfailed", (request) => {
        //     console.log(
        //         `Request failed: ${request.url()} - ${
        //             request.failure().errorText
        //         }`
        //     );
        // });

        // page.on("response", (response) => {
        //     if (!response.ok()) {
        //         console.log(
        //             `HTTP error: ${response.status()} on ${response.url()}`
        //         );
        //     }
        // });

        // ** go to google meet
        await page.goto("https://meet.google.com/", {
            timeout: 30000,
            waitUntil: "networkidle2",
        });

        // ** click on sign in button
        await page.waitForSelector('a[href*="ServiceLogin?"]', {
            visible: true,
        });
        await page.click('a[href*="ServiceLogin?"]', { delay: 2000 });
        console.log("Sign In button clicked!");
        await sleep(2000);

        // ** entering email
        await page.waitForSelector('input[type="email"]', { visible: true });
        await page.click('input[type="email"]');
        await page.keyboard.type(`${email}`, { delay: 300 });
        await sleep(2000);

        await page.waitForSelector("#identifierNext", { visible: true });
        await page.click("#identifierNext");
        await sleep(2000);

        // ** entering password
        await page.keyboard.type(`${password}`, { delay: 200 });
        await sleep(2000);
        await page.keyboard.press("Enter");
        await sleep(2000);

        // ** entering meeting id
        await page.waitForSelector('input[type="text"]', { visible: true });
        await page.click('input[type="text"]');
        await sleep(2000);
        await page.keyboard.type(`${meetingId}`, { delay: 200 });
        await sleep(2000);
        await page.keyboard.press("Enter");

        await sleep(5000);

        const joinButtonSelector = 'button[jsname="Qx7uuf"]';
        // const otherWaysToJoinButtonSelector = 'button[jsname="w5gBed"]';

        const joinButton = await page.$(joinButtonSelector);
        // const otherWaysToJoinButton = await page.$(
        //     otherWaysToJoinButtonSelector
        // );

        await sleep(3000);
        if (joinButton) {
            let popup;
            await page.evaluate(async () => {
                popup = document.querySelector('div[role="dialog"]');
                console.log(popup) 
                if (popup) {
                    popup.style.display = 'none'; 
                    console.log('Popup hidden');
                }
            });
            
            console.log('Popup found');
            await page.waitForSelector('button[jsname="ix0Hvc"]', {visible: true});
            await page.click('button[jsname="ix0Hvc"]');
            
            await sleep(2000);
            console.log("first button found with jsname='Qx7uuf'");
            await joinButton.click();
            console.log("Clicked on the button with jsname='Qx7uuf'");
        }

        // ** stream config
        const stream = await getStream(page, {
            audio: true,
            video: false,
            bitsPerSecond: 128000,
            mimeType: "audio/webm;codecs=opus",
            frameSize: 2000,
        });

        // ** Create a write stream to save the video
        const uniqueFileName = generateFileName();
        const fileStream = fs.createWriteStream(
            path.join(__dirname, "recordings", uniqueFileName)
        );
        stream.pipe(fileStream);
        console.log("Recording started...");

        // Record for a certain duration (e.g., 1 minute here)
        // await new Promise((resolve) => setTimeout(resolve, 60000)); // Record for 1 minute
        const monitorMeetingEnd = async () => {
            await page.waitForSelector('[aria-label="Leave call"]', {
                visible: true,
            });
            while (true) {
                await sleep(5000);

                // ** Check if the "Leave call" button is no longer present
                const isMeetingEnded = await page.evaluate(() => {
                    const leaveButton = document.querySelector(
                        '[aria-label="Leave call"]'
                    );
                    console.log("leaveButton", leaveButton);
                    // return !leaveButton;

                    let participantCount = document.querySelector(
                        ".gFyGKf.BN1Lfc .uGOf1d"
                    ).innerHTML;
                    participantCount = Number(participantCount);
                    console.log(`Number of participants: ${participantCount}`);

                    return participantCount < 2 || !leaveButton;
                });

                if (isMeetingEnded) {
                    console.log("Meeting has ended, stopping the recording...");
                    break;
                }
            }
        };

        await monitorMeetingEnd();

        // ** Stop the recording
        stream.destroy();
        fileStream.end();

        console.log("Recording saved as google_meet_recording.webm");

        await browser.close();

        return {
            success: true,
            message: "Recording saved",
        };
    } catch (error) {
        console.log(error);

        return {
            success: false,
            message: "Recording failed",
        };
    }
};

module.exports = {
    startRecording,
};
