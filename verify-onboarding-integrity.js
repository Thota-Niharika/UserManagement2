
import axios from 'axios';
import { normalizeEmployee } from './src/utils/normalizeEmployee.js';

const API_IP = 'http://13.203.18.82:8090';

async function runVerification() {
    console.log("🚀 Starting Programmatic E2E Onboarding Verification...");

    try {
        // 1. ADD EMPLOYEE
        console.log("\n🔹 Step 1: Adding 'Integrity Tester' Employee...");
        const addRes = await axios.post(`${API_IP}/employees/employees`, {
            fullName: "Integrity Tester",
            email: `tester_${Date.now()}@test.com`,
            phone: "0000000000",
            status: "ONBOARDING",
            dept: "Engineering",
            role: "Developer",
            entity: "FIS"
        });

        const employee = addRes.data.data || addRes.data;
        const employeeId = employee.id || employee.employeeId;
        // The token is often part of the employee response or needs to be fetched
        console.log(`✅ Employee created. ID: ${employeeId}`);

        // 2. SUBMIT ONBOARDING (Stress Test Payload)
        console.log("\n🔹 Step 2: Submitting 'Stress Test' Onboarding Payload...");
        // We simulate a payload that has nested data to test our Scavenging logic
        const onboardingPayload = {
            personal: {
                fathersName: "FATHER_NESTED",
                mothersName: "MOTHER_NESTED",
                bloodGroup: "O+",
                dateOfBirth: "1990-01-01"
            },
            bankDetails: {
                bankName: "NESTED_ICICI",
                branchName: "HYD",
                accountNumber: "9988776655",
                ifscCode: "ICIC0001"
            },
            panProof: {
                panNumber: "NESTED_PAN_123",
                aadhaarNumber: "NESTED_AADHAR_456"
            },
            ssc: { institutionName: "NESTED_HIGH_SCHOOL", hallTicketNo: "HT123" },
            employeeId: employeeId
        };

        // Note: We might need a token if the backend enforces it, 
        // but often the internal submit only needs the employeeId.
        await axios.post(`${API_IP}/onboarding/submit`, onboardingPayload);
        console.log("✅ Onboarding submitted with nested data.");

        // 3. FETCH & VERIFY NORMALIZATION
        console.log("\n🔹 Step 3: Fetching Detail & Verifying Scavenging...");
        const detailRes = await axios.get(`${API_IP}/employees/${employeeId}`);
        const rawDetail = detailRes.data.data || detailRes.data;

        console.log("\n🔍 Raw Response Sample (Bank):", JSON.stringify(rawDetail.bankDetails || rawDetail.bank || "MISSING", null, 2));

        const normalized = normalizeEmployee(rawDetail);

        const checks = [
            { name: "Father Name", val: normalized.fathersName, expected: "FATHER_NESTED" },
            { name: "Bank Name", val: normalized.bankName, expected: "NESTED_ICICI" },
            { name: "PAN Number", val: normalized.panNumber, expected: "NESTED_PAN_123" },
            { name: "Aadhar Number", val: normalized.aadharNumber, expected: "NESTED_AADHAR_456" }
        ];

        let allPassed = true;
        checks.forEach(c => {
            const pass = c.val === c.expected;
            console.log(`${pass ? '✅' : '❌'} ${c.name}: ${c.val}`);
            if (!pass) allPassed = false;
        });

        if (allPassed) {
            console.log("\n✨ E2E VERIFICATION SUCCESSFUL!");
            console.log("The scavenging logic perfectly retrieved all nested data.");
            console.log(`\n👉 PLEASE CHECK IN BROWSER: Search for 'Integrity Tester' (${employeeId}) and View Profile.`);
        } else {
            console.log("\n🔴 E2E VERIFICATION FAILED.");
        }

    } catch (err) {
        console.error("\n❌ ERROR DURING VERIFICATION:", err.response?.data || err.message);
    }
}

runVerification();
