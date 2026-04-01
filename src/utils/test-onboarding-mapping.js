
import { scavengeValue, scavengePath, findProof } from './normalizeEmployee.js';

// Mock the formatDate helper from EmployeeOnboardingForm.jsx
const formatDate = (arr) => {
    if (!arr || !Array.isArray(arr)) return '';
    const [y, m, d] = arr;
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
};

const mockOnboardingRecord = {
    personal: {
        fullName: "Test User",
        phoneNumber: "1234567890",
        fathersName: "Test Father",
        dateOfBirth: [1995, 10, 20]
    },
    panProof: {
        panNumber: "TESTP1234N",
        panFilePath: "/files/pan.png",
        aadhaarNumber: "111122223333",
        aadhaarFilePath: "/files/aadhar.png"
    },
    bank: {
        bankName: "Test Bank",
        accountNumber: "999888777"
    },
    ssc: {
        institutionName: "High School",
        certificatePath: "NOT_UPLOADED"
    }
};

const wrappedResponse = {
    employee: {
        fullName: "Wrapped User",
        bankDetails: { bankName: "Wrapped Bank" }
    }
};

console.log("🚀 Testing Onboarding Scavenging Logic...");

// Mimic the auto-pivot logic
const getPivoted = (raw) => {
    if (!raw.fullName && !raw.name && (raw.employee || raw.data || raw.onboarding)) {
        return raw.employee || raw.data || raw.onboarding;
    }
    return raw;
};

const tests = [
    { 
        name: "Personal - Father Name (Nested)", 
        val: scavengeValue(mockOnboardingRecord, 'fathersName', 'fatherName', 'personal.fathersName'),
        expected: "Test Father"
    },
    {
        name: "Documents - PAN Number (Nested in panProof)",
        val: scavengeValue(mockOnboardingRecord, 'panNumber', 'panProof.panNumber'),
        expected: "TESTP1234N"
    },
    {
        name: "Documents - PAN Path (Nested in panProof)",
        val: scavengePath(mockOnboardingRecord, 'panPath', 'panProof.panFilePath'),
        expected: "/files/pan.png"
    },
    {
        name: "Bank - Bank Name (Nested in bank)",
        val: scavengeValue(mockOnboardingRecord, 'bankDetails.bankName', 'bank.bankName', 'bankName'),
        expected: "Test Bank"
    },
    {
        name: "Auto-Pivot Test (Wrapped Response)",
        val: scavengeValue(getPivoted(wrappedResponse), 'fullName', 'employee.fullName'),
        expected: "Wrapped User"
    },
    {
        name: "Deep Bank Test (Wrapped Response)",
        val: scavengeValue(getPivoted(wrappedResponse), 'bankDetails.bankName', 'employee.bankDetails.bankName'),
        expected: "Wrapped Bank"
    },
    {
        name: "Files - Filter NOT_UPLOADED",
        val: scavengePath(mockOnboardingRecord.ssc, 'certificatePath', 'certificate'),
        expected: null
    },
    {
        name: "Dates - Array Formatting",
        val: formatDate(scavengeValue(mockOnboardingRecord, 'dateOfBirth', 'dob', 'personal.dateOfBirth')),
        expected: "1995-10-20"
    }
];

let allPassed = true;
tests.forEach(t => {
    const pass = t.val === t.expected;
    console.log(`${pass ? '✅' : '❌'} ${t.name} (Got: ${t.val}, Expected: ${t.expected})`);
    if (!pass) allPassed = false;
});

if (allPassed) {
    console.log("\n✨ Onboarding mapping logic is verified and robust!");
} else {
    console.log("\n🔴 Mapping logic failed verification.");
    process.exit(1);
}
