const axios = require('axios');
require('dotenv').config();

const token = process.env.BAKONG_TOKEN;
const url = "https://api-bakong.nbc.gov.kh/v1/check_transaction_by_md5";
const md5 = "a311d844e70a29ed0b16347428757515"; // From logs

async function test() {
    console.log("Token:", token.substring(0, 10) + "...");
    console.log("URL:", url);
    try {
        const response = await axios.post(url, { md5 }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        console.log("Response:", JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error("Error:", error.response ? error.response.data : error.message);
    }
}

test();
