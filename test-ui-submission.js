import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';

// Mimic the browser's Blob by using a string orBuffer for FormData in Node
const API_IP = 'http://13.203.18.82:8090';

async function runTest() {
    console.log("🚀 Testing submitWithDto payload logic...");

    try {
        const employeeId = 1;
        const realToken = "5qirrWEgu87UZEegMsr_EcIrFbORgpYz20HImDcU20I";


        console.log("\n🔹 Step 2: Submitting Onboarding Payload via Multipart/FormData...");

        const dto = {
            fullName: "Multipart Tester",
            email: "multipart_1775052682800@test.com",
            phoneNumber: "0000000000",
            dateOfBirth: "1990-01-01",
            bloodGroup: "A+",
            permanentAddress: "123 Main St",
            presentAddress: "456 Side St",
            fathersName: "Father Name",
            mothersName: "Mother Name",
            emergencyContactName: "Emergency Name",
            emergencyRelationship: "Brother",
            emergencyNumber: "9999999999",

            ssc: {
                id: null,
                educationType: 'SSC',
                institutionName: "High School",
                hallTicketNumber: "HT123",
                passoutYear: "2005",
                percentage: "90",
            },
            bankDetails: {
                bankName: "HDFC Bank",
                branchName: "Main Branch",
                accountNumber: "1234567890",
                ifscCode: "HDFC0001234",
                documentType: 'PASSBOOK',
                status: 'PENDING'
            },
            panProof: {
                panNumber: "ABCDE1234F",
                aadhaarNumber: "123456789012",
                status: 'PENDING'
            },
            employeeId: employeeId
        };

        const formData = new FormData();
        // Mimic new Blob([JSON.stringify(dto)], { type: 'application/json' }) from the browser
        formData.append('data', Buffer.from(JSON.stringify(dto)), {
            filename: 'blob',
            contentType: 'application/json'
        });

        // Add a fake file to demonstrate the multipart functionality
        fs.writeFileSync('dummy.txt', 'This is a test file');
        formData.append('panFile', fs.createReadStream('dummy.txt'));

        // If the URL requires token, we use realToken. The API endpoints proxy config handles /api
        const submitUrl = `${API_IP}/api/onboarding/submit?token=${realToken}`;

        await axios.post(submitUrl, formData, {
            headers: {
                ...formData.getHeaders()
            }
        });
        console.log("✅ Onboarding submitted successfully via multipart stream.");

        // Clean up dummy file
        fs.unlinkSync('dummy.txt');

        // 3. FETCH & VERIFY
        console.log("\n🔹 Step 3: Fetching Detail & Verifying...");
        const detailRes = await axios.get(`${API_IP}/api/employees/${employeeId}`);
        const rawDetail = detailRes.data.data || detailRes.data;

        console.log("\n🔍 Verification checks:");
        const checks = [
            { name: "Bank Name", val: rawDetail.bankDetails?.bankName, expected: "HDFC Bank" },
            { name: "PAN Number", val: rawDetail.identityProofs?.find(p => p.proofType === 'PAN')?.panNumber || rawDetail.panProof?.panNumber || rawDetail.panNumber, expected: "ABCDE1234F" },
            { name: "SSC Institution", val: rawDetail.education?.ssc?.institutionName || rawDetail.ssc?.institutionName, expected: "High School" }
        ];

        let allPassed = true;
        checks.forEach(c => {
            const pass = c.val === c.expected;
            console.log(`${pass ? '✅' : '❌'} ${c.name}: Got '${c.val}' (Expected: '${c.expected}')`);
            if (!pass) allPassed = false;
        });

        if (allPassed) {
            console.log("\n✨ MULTIPART SUBMISSION SUCCESSFUL!");
        } else {
            console.log("\n🔴 MULTIPART SUBMISSION FAILED TO PERSIST ALL DATA.");
        }

    } catch (err) {
        console.error("\n❌ ERROR:", err.response?.data || err.message);
    }
}

runTest();
