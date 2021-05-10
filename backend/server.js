require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const SpotifyWebApi = require("spotify-web-api-node");
const lyricsFinder = require("lyrics-finder");
const path = require("path");
const { spawn } = require("child_process");
const axios = require("axios");
var convert = require("xml-js");
const fs = require("fs");
const async = require("async");

const IBM = require("ibm-cos-sdk");

var config = {
  endpoint: "s3.us-south.cloud-object-storage.appdomain.cloud",
  apiKeyId: process.env.IBM_apiKeyId,
  serviceInstanceId: process.env.IBM_serviceInstanceId,
  signatureVersion: "iam",
};

var cos = new IBM.S3(config);

function getBucketContents(bucketName) {
  console.log(`Retrieving bucket contents from: ${bucketName}`);
  return cos
    .listObjects({ Bucket: bucketName })
    .promise()
    .then((data) => {
      if (data != null && data.Contents != null) {
        for (var i = 0; i < data.Contents.length; i++) {
          var itemKey = data.Contents[i].Key;
          var itemSize = data.Contents[i].Size;
          console.log(`Item: ${itemKey} (${itemSize} bytes).`);
        }
      }
    })
    .catch((e) => {
      console.error(`ERROR: ${e.code} - ${e.message}\n`);
    });
}

function multiPartUpload(bucketName, itemName, filePath) {
  var uploadID = null;

  if (!fs.existsSync(filePath)) {
    console.error(
      new Error(`The file \'${filePath}\' does not exist or is not accessible.`)
    );
    return;
  }

  console.log(
    `Starting multi-part upload for ${itemName} to bucket: ${bucketName}`
  );
  return cos
    .createMultipartUpload({
      Bucket: bucketName,
      Key: itemName,
    })
    .promise()
    .then((data) => {
      uploadID = data.UploadId;

      //begin the file upload
      fs.readFile(filePath, (e, fileData) => {
        //min 5MB part
        var partSize = 1024 * 1024 * 5;
        var partCount = Math.ceil(fileData.length / partSize);

        async.timesSeries(
          partCount,
          (partNum, next) => {
            var start = partNum * partSize;
            var end = Math.min(start + partSize, fileData.length);

            partNum++;

            console.log(
              `Uploading to ${itemName} (part ${partNum} of ${partCount})`
            );

            cos
              .uploadPart({
                Body: fileData.slice(start, end),
                Bucket: bucketName,
                Key: itemName,
                PartNumber: partNum,
                UploadId: uploadID,
              })
              .promise()
              .then((data) => {
                next(e, { ETag: data.ETag, PartNumber: partNum });
              })
              .catch((e) => {
                cancelMultiPartUpload(bucketName, itemName, uploadID);
                console.error(`ERROR: ${e.code} - ${e.message}\n`);
              });
          },
          (e, dataPacks) => {
            cos
              .completeMultipartUpload({
                Bucket: bucketName,
                Key: itemName,
                MultipartUpload: {
                  Parts: dataPacks,
                },
                UploadId: uploadID,
              })
              .promise()
              .then(
                console.log(
                  `Upload of all ${partCount} parts of ${itemName} successful.`
                )
              )
              .catch((e) => {
                cancelMultiPartUpload(bucketName, itemName, uploadID);
                console.error(`ERROR: ${e.code} - ${e.message}\n`);
              });
          }
        );
      });
    })
    .catch((e) => {
      console.error(`ERROR: ${e.code} - ${e.message}\n`);
    });
}

function cancelMultiPartUpload(bucketName, itemName, uploadID) {
  return cos
    .abortMultipartUpload({
      Bucket: bucketName,
      Key: itemName,
      UploadId: uploadID,
    })
    .promise()
    .then(() => {
      console.log(`Multi-part upload aborted for ${itemName}`);
    })
    .catch((e) => {
      console.error(`ERROR: ${e.code} - ${e.message}\n`);
    });
}

const app = express();

app.use(cors());
app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: true }));
// console.log(__dirname)

app.post("/login", (req, res) => {
  const code = req.body.code;
  const spotifyApi = new SpotifyWebApi({
    redirectUri: process.env.REDIRECT_URI,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
  });

  spotifyApi
    .authorizationCodeGrant(code)
    .then((data) =>
      res.json({
        accessToken: data.body.access_token,
        refreshToken: data.body.refresh_token,
        expiresIn: data.body.expires_in,
      })
    )
    .catch((err) => console.log(err));
});

app.post("/refresh", (req, res) => {
  const refreshToken = req.body.refreshToken;
  const spotifyApi = new SpotifyWebApi({
    redirectUri: process.env.REDIRECT_URI,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    refreshToken,
  });

  spotifyApi
    .refreshAccessToken()
    .then((data) => {
      res.json({
        accessToken: data.body.access_token,
        expiresIn: data.body.expires_in,
      });
    })
    .catch((err) => {
      console.log(err);
    });
});

app.get("/lyrics", async (req, res) => {
  const lyrics =
    (await lyricsFinder(req.query.artist, req.query.track)) ||
    "No lyrics Found";
  res.json({ lyrics });
});

app.get("/list", async (req, res) => {
  getBucketContents("testmusicdata");
  var result = await axios
    .get(
      "https://testmusicdata.s3.us-south.cloud-object-storage.appdomain.cloud/"
    )
    .then((res) => {
      // result = convert.xml2json(res.data, { compact: true, spaces: 4 });
      // console.log(json);
      return convert.xml2json(res.data, { compact: true });
    });
  // console.log(result);
  res.json(result);
  // console.log(result);
  // return result;
});

app.get("/download", async (req, res) => {
  // console.log("URI: ", req.query.uri);
  console.log("TITLE: ", req.query.title);
  console.log("Artists: ", req.query.artist);
  console.log("URL: ", req.query.uri);
  let name = "";
  name = req.query.title;
  name += " - ";
  name += req.query.artist[0];

  // req.query.artist.forEach((art) => {
  //   name += `${art}, `;
  // });
  // name = name.slice(0, name.length - 2);
  // name += " - ";
  // name += `${req.query.title}`;

  // console.log(name);

  const destination = path.resolve(__dirname, "./mp3/");
  console.log("DESTINATION: ", destination);
  const child = await spawn(
    `spotifydl ${req.query.uri} -o ${destination}`,
    // `spotifydl --help`,
    {
      shell: true,
    }
  );
  await child.stdout.on("data", (data) => {
    console.log(`stdout: ${data}`);
  });

  await child.stderr.on("data", (data) => {
    console.error(`stderr: ${data}`);
  });

  await child.on("close", (code) => {
    console.log(`child process exited with code ${code}`);
    res.json({ name, dest: destination });
  });
});

app.get("/upload", (req, res) => {
  let name = req.query.name;
  name = name.replace(/['"]+/g, "");
  let path = `${req.query.dest}/${name}.mp3`;
  multiPartUpload("testmusicdata", `${name}.mp3`, `${path}`)
    .then(() => {
      console.log(`Successfully upload ${req.query.name}`);
      res.json("Successfully Uploaded");
    })
    .catch((err) => console.log("Error in uploading: ", err));
  // if (fs.existsSync(path)) {
  //   console.log("EXISTS: ", path);
  // } else {
  //   console.log("NOT EXISTS: ", path);
  // }
  // res.json("Downloaded successfully");
});

app.use(express.static(path.join(__dirname, "build")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`App running on PORT ${PORT}`));
