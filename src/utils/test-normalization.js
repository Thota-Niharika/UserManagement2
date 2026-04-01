
import { normalizeEmployee } from './normalizeEmployee.js';

const mockBackendResponse = {
    id: 101,
    employeeCode: "EMP001",
    personal: {
        fullName: "Johnathan Doe",
        email: "john.doe@example.com",
        phoneNumber: "9876543210",
        dateOfBirth: [1990, 5, 15],
        bloodGroup: "O+",
        fathersName: "Robert Doe",
        fathersPhone: "9998887776",
        mothersName: "Mary Doe",
        mothersPhone: "8887776665",
        emergencyContactName: "Jane Doe",
        emergencyRelationship: "Spouse",
        emergencyNumber: "7776665554",
        presentAddress: "123 Tech Lane, Silicon Valley",
        permanentAddress: "456 Home Street, City Center"
    },
    panProof: {
        panNumber: "ABCDE1234F",
        panFilePath: "/uploads/pan.pdf",
        aadhaarNumber: "1234-5678-9012",
        aadhaarFilePath: "/uploads/aadhar.pdf",
        photoFilePath: "/uploads/photo.jpg",
        passportFilePath: "/uploads/passport.pdf",
        voterIdFilePath: "NOT_UPLOADED"
    },
    bankDetails: {
        bankName: "Global Bank",
        branchName: "Tech City",
        accountNumber: "100200300400",
        ifscCode: "GLB000123",
        upiId: "john@glb",
        documentFilePath: "/uploads/passbook.pdf"
    },
    ssc: {
        institutionName: "City High",
        passoutYear: "2006",
        percentageCgpa: "95",
        certificatePath: "/edu/ssc.pdf"
    },
    intermediate: {
        institutionName: "Central College",
        passoutYear: "2008",
        percentageCgpa: "92",
        certificatePath: "/edu/inter.pdf"
    },
    graduation: {
        institutionName: "Tech University",
        passoutYear: "2012",
        percentageCgpa: "85",
        certificatePath: "/edu/grad.pdf"
    },
    status: "Active",
    onboardingStatus: "COMPLETED"
};

console.log("🚀 Starting Normalization Test...\n");

const result = normalizeEmployee(mockBackendResponse);

const checks = [
    { label: "ID Mapping", pass: result.id === 101 && result.empCode === "EMP001" },
    { label: "Personal Scavenging (Name)", pass: result.name === "Johnathan Doe" },
    { label: "Personal Scavenging (Email)", pass: result.email === "john.doe@example.com" },
    { label: "Date Mapping", pass: result.dateOfBirth === "1990-05-15" },
    { label: "Identity Scavenging (PAN)", pass: result.panNumber === "ABCDE1234F" && result.panPath === "/uploads/pan.pdf" },
    { label: "Identity Scavenging (Aadhar)", pass: result.aadharNumber === "1234-5678-9012" && result.aadharPath === "/uploads/aadhar.pdf" },
    { label: "File Scavenging (Photo)", pass: result.photoPath === "/uploads/photo.jpg" },
    { label: "Bank Scavenging (Account)", pass: result.accountNumber === "100200300400" },
    { label: "Bank Scavenging (IFSC)", pass: result.ifscCode === "GLB000123" },
    { label: "Bank File Scavenging", pass: result.passbookPath === "/uploads/passbook.pdf" },
    { label: "SSC Extraction", pass: result.ssc?.institutionName === "City High" },
    { label: "NOT_UPLOADED Filtering", pass: result.voterPath === null }
];

let allPassed = true;
checks.forEach(c => {
    console.log(`${c.pass ? '✅' : '❌'} ${c.label}`);
    if (!c.pass) allPassed = false;
});

if (allPassed) {
    console.log("\n✨ ALL TESTS PASSED! Normalization is hyper-robust.");
} else {
    console.log("\n🔴 SOME TESTS FAILED. Check logic.");
    process.exit(1);
}
