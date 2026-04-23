import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

const TOKEN = 'ILrKureqLLpBCwAU6grmrIIHUzSbunqXPVRDkcewNOE';
const BASE_URL = 'http://192.168.1.22:8090/api';

const data = {
  "fullName": "John Wick",
  "email": "john.wick@example.com",
  "phoneNumber": "9988776655",
  "dateOfBirth": "1990-01-15",
  "bloodGroup": "O+",
  "permanentAddress": "Continental Hotel, Room 101, New York",
  "presentAddress": "Continental Hotel, Room 101, New York",
  "fathersName": "Marcus Wick",
  "fathersPhone": "9900990099",
  "mothersName": "Helen Wick",
  "mothersPhone": "9900990088",
  "emergencyContactName": "Winston Scott",
  "emergencyRelationship": "Manager",
  "emergencyNumber": "8800880088",

  "ssc": {
    "institutionName": "St. Peters High School",
    "hallTicketNumber": "SSC2006-001",
    "passoutYear": 2006,
    "percentage": 88.5
  },

  "intermediate": {
    "institutionName": "Vignan Junior College",
    "hallTicketNumber": "INTER2008-55",
    "passoutYear": 2008,
    "percentage": 92.0
  },

  "graduations": [
    {
      "educationType": "GRADUATION",
      "institutionName": "IIT Madras",
      "hallTicketNumber": "BTECH-2012-09",
      "passoutYear": 2012,
      "percentage": 85.0
    }
  ],

  "postGraduations": [
    {
      "educationType": "POST_GRADUATION",
      "institutionName": "Stanford University",
      "hallTicketNumber": "MS-2014-442",
      "passoutYear": 2014,
      "percentage": 90.0
    }
  ],

  "panProof": {
    "panNumber": "ABCDE1234F"
  },

  "aadharProof": {
    "aadhaarNumber": "123456789012"
  },

  "photoProof": { "status": "PENDING" },
  "passportProof": { "status": "PENDING" },
  "voterProof": { "status": "PENDING" },

  "bankDetails": {
    "bankName": "Central Bank",
    "branchName": "New York City",
    "accountNumber": "100020003000",
    "ifscCode": "CBIN0001234",
    "documentType": "PASSBOOK"
  },

  "workExperiences": [
    {
      "companyName": "High Table Solutions",
      "yearsOfExperience": 4
    }
  ],

  "internships": [
    {
      "companyName": "Continental Labs",
      "joiningDate": "2011-06-01",
      "relievingDate": "2011-12-01",
      "internshipId": "INT-101",
      "duration": "6 Months"
    }
  ],

  "otherCertificates": [
    {
      "instituteName": "Amazon Web Services",
      "certificateNumber": "AWS-12345",
      "status": "PENDING"
    }
  ]
};

async function test() {
  const form = new FormData();
  form.append('data', JSON.stringify(data), { contentType: 'application/json' });
  
  // Add a few dummy files to satisfy backend
  const dummyFile = Buffer.from('dummy content');
  form.append('photo', dummyFile, 'photo.jpg');
  form.append('pan', dummyFile, 'pan.jpg');
  form.append('ssc', dummyFile, 'ssc.jpg');
  form.append('bank', dummyFile, 'bank.jpg');

  try {
    console.log(`🚀 Sending test submission to ${BASE_URL}/onboarding/submit?token=${TOKEN}...`);
    const res = await axios.post(`${BASE_URL}/onboarding/submit?token=${TOKEN}`, form, {
      headers: form.getHeaders()
    });
    console.log('✅ SUCCESS:', res.data);
  } catch (err) {
    console.error('❌ FAILED:', err.response?.status, err.response?.data || err.message);
  }
}

test();
