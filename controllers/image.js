const https = require('https');
const querystring = require('querystring');

const FACEPP_HOST = 'api-us.faceplusplus.com';
const FACEPP_PATH = '/facepp/v3/detect';

const requestFaceDetection = (input) =>
  new Promise((resolve, reject) => {
    const body = querystring.stringify({
      api_key: process.env.FACEPP_API_KEY,
      api_secret: process.env.FACEPP_API_SECRET,
      image_url: input,
      return_attributes: 'age',
    });

    const request = https.request(
      {
        hostname: FACEPP_HOST,
        path: FACEPP_PATH,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (response) => {
        let data = '';

        response.on('data', (chunk) => {
          data += chunk;
        });

        response.on('end', () => {
          try {
            const parsed = JSON.parse(data);

            if (response.statusCode >= 400 || parsed.error_message) {
              return reject(parsed);
            }

            resolve(parsed);
          } catch (error) {
            reject(error);
          }
        });
      }
    );

    request.on('error', reject);
    request.write(body);
    request.end();
  });

const handleApiCall = async (req, res) => {
  if (!process.env.FACEPP_API_KEY || !process.env.FACEPP_API_SECRET) {
    return res.status(500).json('missing Face++ credentials');
  }

  if (!req.body.input) {
    return res.status(400).json('missing image input');
  }

  try {
    const data = await requestFaceDetection(req.body.input);
    return res.json(data);
  } catch (error) {
    console.error('Face++ API error:', error);
    return res.status(400).json('unable to work with API');
  }
};

const handleImage = (req, res, db) => {
  const { id } = req.body;
  db('users')
    .where('id', '=', id)
    .increment('entries', 1)
    .returning('entries')
    .then((entries) => {
      res.json(entries[0]);
    })
    .catch(() => res.status(400).json('unable to get entries'));
};

module.exports = {
  handleImage,
  handleApiCall,
};
