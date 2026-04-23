// import React, { useState, useEffect, useMemo } from 'react';
// import { useSearchParams } from 'react-router-dom';
// import { Upload, Plus, Trash2, CheckCircle, ChevronRight, ChevronLeft } from 'lucide-react';
// import apiService from '../../../services/api';
// import { findByPattern, findProof, scavengeValue, scavengePath } from '../../../utils/normalizeEmployee';

// const EmployeeOnboardingForm = () => {
//     const [searchParams] = useSearchParams();
//     const token = searchParams.get('token');
//     const [step, setStep] = useState(1);
//     const [errors, setErrors] = useState({});
//     const [loading, setLoading] = useState(false);
//     const [rejectedFields, setRejectedFields] = useState([]);

import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Upload, Plus, Trash2, CheckCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import apiService, { submitOnboarding } from "../../../services/api";
import { normalizeEmployee, scavengeValue, scavengePath, findProof } from '../../../utils/normalizeEmployee';
import { compressFile } from '../../../utils/file';

const EmployeeOnboardingForm = () => {

    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [step, setStep] = useState(1);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [rejectedFields, setRejectedFields] = useState([]);


    React.useEffect(() => {
        if (token) {
            fetchExistingData(token);
        }
    }, [token]);

    const fetchExistingData = async (onboardingToken) => {
        setLoading(true);
        try {
            console.log("🚀 [STRICT] Fetching onboarding data...");
            const data = await apiService.getOnboardingByToken(onboardingToken);

            console.log("🔥 FINAL DATA IN COMPONENT:", data); // 👈 ADD THIS

            if (!data || typeof data !== "object" || Array.isArray(data)) {
                console.error("Invalid onboarding data:", data);
                return;
            }

            const d = data.data || data.onboarding || data;

            if (d) {
                if (d.rejectedDocuments) {
                    setRejectedFields(d.rejectedDocuments);
                }
                mapEmployeeToForm(d);
            }
        } catch (error) {
            console.error("❌ Failed to fetch existing data:", error);
        } finally {
            setLoading(false);
        }
    };

    const mapEmployeeToForm = (rawEmp) => {
        if (!rawEmp) return;

        console.log("🚀 [DEBUG] Starting Deep Onboarding Mapping...");
        
        // Auto-Pivot: If the response is wrapped (common in some backend versions)
        let emp = rawEmp;
        if (!emp.fullName && !emp.name && (emp.employee || emp.data || emp.onboarding)) {
            emp = emp.employee || emp.data || emp.onboarding;
            console.log("🔄 [DEBUG] Auto-Pivoted to nested data object.");
        }

        // --- MERGE SIBLING ONBOARDING DATA ---
        if (emp?.onboardingForm && typeof emp.onboardingForm === 'object') {
            emp = { ...emp.onboardingForm, ...emp };
        } else if (emp?.onboarding && typeof emp.onboarding === 'object' && !emp.onboarding.status) {
            emp = { ...emp.onboarding, ...emp };
        }

        // --- [MANDATE 2] DEEP SCAVENGING MAPPING ---
        setPersonal({
            employeeCode: scavengeValue(emp, 'employeeCode', 'empCode', 'employeeId', 'empId', 'personal.employeeCode') || '',
            fullName: scavengeValue(emp, 'fullName', 'name', 'personal.fullName', 'employee.fullName', 'personalDetails.fullName') || '',
            phone: scavengeValue(emp, 'phone', 'phoneNumber', 'personal.phoneNumber', 'employee.phone', 'personalDetails.phoneNumber') || '',
            bloodGroup: scavengeValue(emp, 'bloodGroup', 'personal.bloodGroup', 'employee.bloodGroup', 'personalDetails.bloodGroup') || '',
            email: scavengeValue(emp, 'email', 'personal.email', 'employee.email', 'personalDetails.email') || '',
            permAddress: scavengeValue(emp, 'permanentAddress', 'permAddress', 'personal.permanentAddress', 'employee.permanentAddress') || '',
            presAddress: scavengeValue(emp, 'presentAddress', 'presAddress', 'personal.presentAddress', 'employee.presentAddress') || '',
            fatherName: scavengeValue(emp, 'fathersName', 'fatherName', 'personal.fathersName', 'employee.fathersName') || '',
            fatherPhone: scavengeValue(emp, 'fathersPhone', 'fatherPhone', 'personal.fathersPhone', 'employee.fathersPhone') || '',
            motherName: scavengeValue(emp, 'mothersName', 'motherName', 'personal.mothersName', 'employee.mothersName') || '',
            motherPhone: scavengeValue(emp, 'mothersPhone', 'motherPhone', 'personal.mothersPhone', 'employee.mothersPhone') || '',
            emergencyName: scavengeValue(emp, 'emergencyContactName', 'emergencyName', 'personal.emergencyContactName', 'employee.emergencyContactName') || '',
            emergencyRel: scavengeValue(emp, 'emergencyRelationship', 'emergencyRel', 'personal.emergencyRelationship', 'employee.emergencyRelationship') || '',
            emergencyPhone: scavengeValue(emp, 'emergencyNumber', 'emergencyPhone', 'personal.emergencyNumber', 'employee.emergencyNumber') || '',
            dateOfBirth: scavengeValue(emp, 'dateOfBirth', 'dob', 'personal.dateOfBirth', 'employee.dateOfBirth')
                ? (Array.isArray(scavengeValue(emp, 'dateOfBirth', 'dob', 'personal.dateOfBirth', 'employee.dateOfBirth')) 
                    ? formatDate(scavengeValue(emp, 'dateOfBirth', 'dob', 'personal.dateOfBirth', 'employee.dateOfBirth')) 
                    : String(scavengeValue(emp, 'dateOfBirth', 'dob', 'personal.dateOfBirth', 'employee.dateOfBirth')).split('T')[0]) 
                : '',
        });

        const mapEdu = (edu) => {
            if (!edu) return { institutionName: '', htNumber: '', year: '', percentage: '', certificate: null };
            return {
                id: edu.id || null,
                institutionName: edu.institutionName || edu.school || edu.college || '',
                htNumber: edu.hallTicketNo || edu.htNumber || '',
                year: edu.passoutYear || edu.year || '',
                percentage: edu.percentageCgpa || edu.percentage || '',
                certificate: scavengePath(edu, 'certificatePath', 'certificate') ? { 
                    name: scavengePath(edu, 'certificatePath', 'certificate').split('/').pop(), 
                    isServerFile: true, 
                    path: scavengePath(edu, 'certificatePath', 'certificate') 
                } : null,
                marksMemo: scavengePath(edu, 'marksMemoPath', 'marksMemo') ? { 
                    name: scavengePath(edu, 'marksMemoPath', 'marksMemo').split('/').pop(), 
                    isServerFile: true, 
                    path: scavengePath(edu, 'marksMemoPath', 'marksMemo') 
                } : null,
            };
        };

        // 🔧 FIX 1: Handle education ARRAY properly
        const eduList = Array.isArray(emp.education) ? emp.education : [];
        const getEdu = (type) => eduList.find(e => e.educationType === type) || {};

        setEducation({
            ssc: mapEdu(getEdu('SSC')),
            inter: mapEdu(getEdu('INTERMEDIATE')),
            grad: mapEdu(getEdu('GRADUATION')),
            postGrad: eduList.filter(e => e.educationType === 'POST_GRADUATION').map(mapEdu),
            otherCerts: (scavengeValue(emp, 'otherCertificates', 'education.otherCertificates', 'employee.otherCertificates') || []).map(cert => ({
                id: cert.id || null,
                institute: cert.instituteName || cert.institute || '',
                certNumber: cert.certificateNumber || cert.certNumber || '',
                certificate: scavengePath(cert, 'certificatePath', 'certificate') ? {
                    name: scavengePath(cert, 'certificatePath', 'certificate').split('/').pop(),
                    isServerFile: true,
                    path: scavengePath(cert, 'certificatePath', 'certificate')
                } : null,
            })),
        });

        // 🔧 FIX 2: Handle experience arrays correctly
        const internships = emp.internships || [];
        const work = emp.workExperiences || [];
        
        setExperience({
            internships: internships.map(i => ({
                company: i.companyName || '',
                joining: formatDate(i.joiningDate) || '',
                relieving: formatDate(i.relievingDate) || '',
                id: i.internshipId || i.id || '',
                duration: i.duration || '',
                offerLetter: i.offerLetterPath ? { 
                    name: String(i.offerLetterPath).split('/').pop(), isServerFile: true, path: i.offerLetterPath 
                } : null,
                relievingLetter: i.experienceCertificatePath ? { 
                    name: String(i.experienceCertificatePath).split('/').pop(), isServerFile: true, path: i.experienceCertificatePath 
                } : null,
            })),
            workHistory: work.map(w => ({
                company: w.companyName || '',
                years: w.yearsOfExperience || w.yearsOfExp || '',
                offerLetter: w.offerLetterPath ? { 
                    name: String(w.offerLetterPath).split('/').pop(), isServerFile: true, path: w.offerLetterPath 
                } : null,
                relievingLetter: w.relievingLetterPath ? { 
                    name: String(w.relievingLetterPath).split('/').pop(), isServerFile: true, path: w.relievingLetterPath 
                } : null,
                payslips: w.payslipsPath ? { 
                    name: String(w.payslipsPath).split('/').pop(), isServerFile: true, path: w.payslipsPath 
                } : null,
                experienceCert: w.experienceCertificatePath ? { 
                    name: String(w.experienceCertificatePath).split('/').pop(), isServerFile: true, path: w.experienceCertificatePath 
                } : null,
            }))
        });

        // 🔧 FIX 3: Bank mapping (stop guessing)
        const bank = emp.bankDetails || {};
        const bankDoc = bank.documentFilePath || emp.passbookPath || null;
        
        setBank({
            id: bank.id || null,
            bankName: bank.bankName || '',
            branchName: bank.branchName || '',
            accountNumber: bank.accountNumber || '',
            ifscCode: bank.ifscCode || '',
            upiId: bank.upiId || '',
            documentType: bank.documentType || 'PASSBOOK',
            bankDocumentPath: bankDoc || '',
            docImage: bankDoc ? { name: bankDoc.split('/').pop(), isServerFile: true, path: bankDoc } : null,
            employeeFormId: emp.employeeId || emp.id || null
        });

        // 🔧 FIX 4: Identity proofs
        const proofs = emp.identityProofs || [];
        const pan = proofs.find(p => p.type === 'PAN' || p.proofType === 'PAN') || {};
        const aadhaar = proofs.find(p => p.type === 'AADHAR' || p.proofType === 'AADHAR') || {};
        
        // Preserve other image paths if they aren't embedded in the proofs array yet
        const photoPath = scavengePath(emp, 'photoPath') || proofs.find(p => p.type === 'PHOTO')?.filePath;
        const passportPath = scavengePath(emp, 'passportPath') || proofs.find(p => p.type === 'PASSPORT')?.filePath;
        const voterPath = scavengePath(emp, 'voterPath') || proofs.find(p => p.type === 'VOTER')?.filePath;

        setDocuments({
            id: emp.id || null,
            panNumber: pan.number || pan.panNumber || '',
            panCard: pan.filePath ? { name: String(pan.filePath).split('/').pop(), isServerFile: true, path: pan.filePath } : null,
            aadharNumber: aadhaar.number || aadhaar.aadharNumber || '',
            aadharCard: aadhaar.filePath ? { name: String(aadhaar.filePath).split('/').pop(), isServerFile: true, path: aadhaar.filePath } : null,
            passportPhoto: photoPath ? { name: photoPath.split('/').pop(), isServerFile: true, path: photoPath } : null,
            passportDoc: passportPath ? { name: passportPath.split('/').pop(), isServerFile: true, path: passportPath } : null,
            voterId: voterPath ? { name: voterPath.split('/').pop(), isServerFile: true, path: voterPath } : null,
        });

        console.log("✅ [DEBUG] Deep Onboarding Mapping Complete.");
    };

    const formatDate = (arr) => {
        if (!arr || !Array.isArray(arr)) return '';
        const [y, m, d] = arr;
        return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    };


    const validateStep = (currentStep) => {
        let newErrors = {};

        if (currentStep === 1) {
            // Relaxed: fatherPhone and motherPhone no longer strictly required to prevent friction
            const required = ['fullName', 'phone', 'email', 'dateOfBirth', 'permAddress', 'presAddress', 'fatherName', 'motherName', 'emergencyName', 'emergencyRel', 'emergencyPhone'];
            for (const field of required) {
                if (!personal[field]) {
                    newErrors[field] = 'This field is required';
                }
            }
        } else if (currentStep === 2) {
            const levels = ['ssc', 'inter', 'grad'];
            for (const level of levels) {
                const data = education[level];
                if (!data.institutionName) newErrors[`${level}_institutionName`] = 'Required';
                if (!data.htNumber) newErrors[`${level}_htNumber`] = 'Required';
                if (!data.year) newErrors[`${level}_year`] = 'Required';
                if (!data.percentage) newErrors[`${level}_percentage`] = 'Required';
                if (!data.certificate) newErrors[`${level}_certificate`] = 'Required';
            }
        } else if (currentStep === 4) {
            // Mandated: upiId is now required by backend
            const requiredBank = ['bankName', 'branchName', 'accountNumber', 'ifscCode', 'upiId'];
            for (const field of requiredBank) {
                if (!bank[field]) {
                    newErrors[field] = 'Required';
                }
            }
            if (bank.ifscCode && !/^[A-Z]{4}0[0-9]{6}$/.test(bank.ifscCode)) {
                newErrors['ifscCode'] = 'Invalid IFSC format';
            }
            if (!bank.docImage) {
                newErrors['bankDoc'] = 'Bank document (passbook/cheque) is required';
            }
        } else if (currentStep === 5) {
            // Clean values before validation (match backend cleanFields)
            const cleanPan = (documents.panNumber || '').replace(/\s+/g, '').toUpperCase();
            const cleanAadhar = (documents.aadharNumber || '').replace(/\s+/g, '');

            if (!cleanPan) {
                newErrors['panNumber'] = 'Required';
            } else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanPan)) {
                newErrors['panNumber'] = 'Invalid PAN format (e.g. ABCDE1234F)';
            }
            if (!documents.panCard) newErrors['panCard'] = 'Required';

            if (!cleanAadhar) {
                newErrors['aadharNumber'] = 'Required';
            } else if (!/^[0-9]{12}$/.test(cleanAadhar)) {
                newErrors['aadharNumber'] = 'Aadhaar must be exactly 12 digits';
            }
            if (!documents.aadharCard) newErrors['aadharCard'] = 'Required';

            if (!documents.passportPhoto) newErrors['passportPhoto'] = 'Required';
        }

        setErrors(newErrors);

        if (Object.keys(newErrors).length > 0) {
            // Wait for DOM update and scroll to first error
            setTimeout(() => {
                const firstError = document.querySelector('.input-group.error');
                if (firstError) {
                    firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);
            return false;
        }

        return true;
    };

    const goToStep = (nextStep) => {
        if (nextStep > step) {
            if (!validateStep(step)) return;
        }
        if (nextStep === 6) {
            // No extra validation needed for review step transition if step 5 passed
        }
        setErrors({}); // Clear errors when moving
        setStep(nextStep);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };



    // --- State ---
    const [personal, setPersonal] = useState({
        employeeCode: '',
        fullName: '',
        phone: '',
        bloodGroup: '',
        email: '',
        permAddress: '',
        presAddress: '',
        fatherName: '',
        fatherPhone: '',
        motherName: '',
        motherPhone: '',
        emergencyName: '',
        emergencyRel: '',
        emergencyPhone: '',
        dateOfBirth: '',
        employeeFormId: null, // Track the ID if returning to form
    });

    const [education, setEducation] = useState({
        ssc: { institutionName: '', htNumber: '', year: '', percentage: '', certificate: null, certificatePath: '', marksMemoPath: '' },
        inter: { institutionName: '', htNumber: '', year: '', percentage: '', certificate: null, certificatePath: '', marksMemoPath: '' },
        grad: { institutionName: '', htNumber: '', year: '', percentage: '', marksMemo: null, certificate: null, certificatePath: '', marksMemoPath: '' },
        postGrad: [],  // Array of objects
        otherCerts: [], // { institute: '', certNumber: '', certificate: null, certificatePath: '' }
    });

    const [experience, setExperience] = useState({
        internships: [], // { company: '', joining: '', relieving: '', id: '', duration: '', offerLetter: null, relievingLetter: null }
        workHistory: []  // { company: '', years: '', offerLetter: null, relievingLetter: null, payslips: null, experienceCert: null }
    });

    const [documents, setDocuments] = useState({
        panNumber: '',
        panCard: null,
        panCardPath: '',
        aadharNumber: '',
        aadharCard: null,
        aadharCardPath: '',
        passportPhoto: null,
        passportPhotoPath: '',
        passportDoc: null,
        passportDocPath: '',
        voterId: null,
        voterIdPath: '',
    });

    const [livePhoto, setLivePhoto] = useState(null);

    const [bank, setBank] = useState({
        bankName: '',
        branchName: '',
        accountNumber: '',
        ifscCode: '',
        documentType: 'PASSBOOK',
        bankDocumentPath: '',
        docImage: null,
        upiId: ''
    });

    // --- Handlers ---
    const isFieldRejected = (fieldName) => {
        if (!rejectedFields || rejectedFields.length === 0) return false;
        return rejectedFields.some(rf => {
            const pattern = rf.toLowerCase();
            const field = fieldName.toLowerCase();
            return field.includes(pattern) || pattern.includes(field);
        });
    };

    const handlePersonalChange = (e) => {
        const { name, value } = e.target;
        setPersonal(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => {
                const newErrs = { ...prev };
                delete newErrs[name];
                return newErrs;
            });
        }
    };

    const handleEduChange = (level, field, value) => {
        setEducation(prev => ({
            ...prev,
            [level]: { ...prev[level], [field]: value }
        }));
        const errKey = `${level}_${field}`;
        if (errors[errKey]) {
            setErrors(prev => {
                const newErrs = { ...prev };
                delete newErrs[errKey];
                return newErrs;
            });
        }
    };

    const handleFileChange = (section, level, field, file, index = null) => {
        if (!file) return;

        if (section === 'education') {
            if (index !== null) {
                const newArr = [...education[level]];
                newArr[index][field] = file;
                setEducation(prev => ({ ...prev, [level]: newArr }));
            } else {
                setEducation(prev => ({
                    ...prev,
                    [level]: { ...prev[level], [field]: file }
                }));
                const errKey = `${level}_${field}`;
                if (errors[errKey]) {
                    setErrors(prev => {
                        const newErrs = { ...prev };
                        delete newErrs[errKey];
                        return newErrs;
                    });
                }
            }
        } else if (section === 'experience') {
            const newArr = [...experience[level]];
            newArr[index][field] = file;
            setExperience(prev => ({ ...prev, [level]: newArr }));
        } else if (section === 'bank') {
            setBank(prev => ({ ...prev, [field]: file }));
        } else if (section === 'documents') {
            setDocuments(prev => ({ ...prev, [field]: file }));
            if (errors[field]) {
                setErrors(prev => {
                    const newErrs = { ...prev };
                    delete newErrs[field];
                    return newErrs;
                });
            }
        }
    };


    const handleBankChange = (e) => {
        const { name, value } = e.target;
        setBank(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => {
                const newErrs = { ...prev };
                delete newErrs[name];
                return newErrs;
            });
        }
    };

    const handleDocumentChange = (e) => {
        const { name, value } = e.target;
        // Match backend cleanFields(): uppercase PAN, strip whitespace from Aadhaar
        let cleanedValue = value;
        if (name === 'panNumber') {
            cleanedValue = value.replace(/\s+/g, '').toUpperCase();
        } else if (name === 'aadharNumber') {
            cleanedValue = value.replace(/\s+/g, '');
        }
        setDocuments(prev => ({ ...prev, [name]: cleanedValue }));
        if (errors[name]) {
            setErrors(prev => {
                const newErrs = { ...prev };
                delete newErrs[name];
                return newErrs;
            });
        }
    };

    // Dynamic Lists Handlers
    const addPostGrad = () => {
        setEducation(prev => ({
            ...prev,
            postGrad: [...prev.postGrad, { institutionName: '', year: '', percentage: '', certificate: null, certificatePath: '', uploading: false }]
        }));
    };

    const updatePostGrad = (index, field, value) => {
        if (field === 'certificate') {
            const newArr = [...education.postGrad];
            newArr[index][field] = value;
            newArr[index].uploading = true;
            setEducation(prev => ({ ...prev, postGrad: newArr }));

            performUpload(value,
                (path) => {
                    const updated = [...education.postGrad];
                    updated[index][field + 'Path'] = path;
                    updated[index].uploading = false;
                    setEducation(prev => ({ ...prev, postGrad: updated }));
                },
                () => {
                    const updated = [...education.postGrad];
                    updated[index].uploading = false;
                    setEducation(prev => ({ ...prev, postGrad: updated }));
                }
            );
        } else {
            const newArr = [...education.postGrad];
            newArr[index][field] = value;
            setEducation(prev => ({ ...prev, postGrad: newArr }));
        }
    };

    const removePostGrad = (index) => {
        setEducation(prev => ({
            ...prev,
            postGrad: prev.postGrad.filter((_, i) => i !== index)
        }));
    };

    const addCert = () => {
        setEducation(prev => ({
            ...prev,
            otherCerts: [...prev.otherCerts, { institute: '', certNumber: '', certificate: null, certificatePath: '', uploading: false }]
        }));
    };

    const updateCert = (index, field, value) => {
        if (field === 'certificate') {
            const newArr = [...education.otherCerts];
            newArr[index][field] = value;
            newArr[index].uploading = true;
            setEducation(prev => ({ ...prev, otherCerts: newArr }));

            performUpload(value,
                (path) => {
                    const updated = [...education.otherCerts];
                    updated[index][field + 'Path'] = path;
                    updated[index].uploading = false;
                    setEducation(prev => ({ ...prev, otherCerts: updated }));
                },
                () => {
                    const updated = [...education.otherCerts];
                    updated[index].uploading = false;
                    setEducation(prev => ({ ...prev, otherCerts: updated }));
                }
            );
        } else {
            const newArr = [...education.otherCerts];
            newArr[index][field] = value;
            setEducation(prev => ({ ...prev, otherCerts: newArr }));
        }
    };

    const removeCert = (index) => {
        setEducation(prev => ({
            ...prev,
            otherCerts: prev.otherCerts.filter((_, i) => i !== index)
        }));
    };

    // Internship Handlers
    const addInternship = () => {
        setExperience(prev => ({
            ...prev,
            internships: [...prev.internships, { company: '', joining: '', relieving: '', id: '', duration: '', offerLetter: null, relievingLetter: null, offerLetterPath: '', relievingLetterPath: '', uploading: false }]
        }));
    };

    const updateInternship = (index, field, value) => {
        const newArr = [...experience.internships];
        newArr[index][field] = value;
        setExperience(prev => ({ ...prev, internships: newArr }));
    };

    const removeInternship = (index) => {
        setExperience(prev => ({ ...prev, internships: prev.internships.filter((_, i) => i !== index) }));
    };

    // Work History Handlers
    const addWork = () => {
        setExperience(prev => ({
            ...prev,
            workHistory: [...prev.workHistory, { company: '', years: '', offerLetter: null, relievingLetter: null, payslips: null, experienceCert: null, offerLetterPath: '', relievingLetterPath: '', payslipsPath: '', experienceCertPath: '', uploading: false }]
        }));
    };

    const updateWork = (index, field, value) => {
        if (['offerLetter', 'relievingLetter', 'payslips', 'experienceCert'].includes(field)) {
            const newArr = [...experience.workHistory];
            newArr[index][field] = value;
            newArr[index].uploading = true;
            setExperience(prev => ({ ...prev, workHistory: newArr }));

            performUpload(value,
                (path) => {
                    const updated = [...experience.workHistory];
                    updated[index][field + 'Path'] = path;
                    updated[index].uploading = false;
                    setExperience(prev => ({ ...prev, workHistory: updated }));
                },
                () => {
                    const updated = [...experience.workHistory];
                    updated[index].uploading = false;
                    setExperience(prev => ({ ...prev, workHistory: updated }));
                }
            );
        } else {
            const newArr = [...experience.workHistory];
            newArr[index][field] = value;
            setExperience(prev => ({ ...prev, workHistory: newArr }));
        }
    };

    const removeWork = (index) => {
        setExperience(prev => ({ ...prev, workHistory: prev.workHistory.filter((_, i) => i !== index) }));
    };

    const fileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            if (!file) {
                resolve(null);
                return;
            }
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    };

    // const handleSubmit = async (e) => {
    //     e.preventDefault();

    //     // Final validation check for the last step
    //     // if (!validateStep(5)) return;

    //     try {
    //         console.log("🚀 Starting Onboarding Submission (Action Plan: Multipart)...");



    // Helper to validate path length and get filename
    // const getFileInfo = (file, fieldName) => {
    //     if (!file) return null;
    //     const fileName = file.name || 'document';
    //     console.log(`📄 Field: ${fieldName}, Name: ${fileName}, Length: ${fileName.length}`);

    //     if (fileName.length > 200) {
    //         throw new Error(`Filename for ${fieldName} is too long (${fileName.length} chars). Max 200.`);
    //     }
    //     return fileName;
    // };

    const getFileInfo = (file, fieldName) => {
        if (!file) return null;

        // if server file already exists
        if (file.isServerFile && file.path) {
            const name = file.path.split('/').pop();
            return name;
        }

        const fileName = file.name || null;

        console.log(`📄 Field: ${fieldName}, Name: ${fileName}`);

        if (!fileName) {
            throw new Error(`${fieldName} filename missing`);
        }

        if (fileName.length > 200) {
            throw new Error(`Filename for ${fieldName} too long`);
        }

        return fileName;
    };

    const mapEducation = (edu) => {
        if (!edu) return null;
        return {
            institutionName: edu.school || edu.college || '',
            hallTicketNumber: edu.htNumber || '',
            passoutYear: edu.year || '',
            percentage: edu.percentage || '',
            certificateFilePath: getFileInfo(edu.certificate, "Edu Cert"),
            marksMemoFilePath: getFileInfo(edu.marksMemo, "Edu Marks")
        };
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();

        if (!validateStep(5)) {
            alert("Please fix the validation errors before submitting.");
            setStep(5);
            return;
        }

        try {
            setLoading(true);

            const tokenFromUrl = new URLSearchParams(window.location.search).get('token');
            const submitToken = token || tokenFromUrl;

            // Fix 2: Stop Form Submit if File Missing
            if (!bank.docImage && !bank.bankDocumentPath) {
                alert("Please upload bank document (Cancelled Cheque / Passbook).");
                setStep(4);
                setLoading(false);
                return;
            }

            // --- FIXED: Group Metadata into 'data' part (Backend Requirement) ---
            const formData = new FormData();

            // 1. Prepare Metadata Object (DTO) - Matches user's JSON specification
            const onboardingData = {
                fullName: personal.fullName || '',
                email: personal.email || '',
                phoneNumber: personal.phone || '',
                dateOfBirth: personal.dateOfBirth || null,
                bloodGroup: personal.bloodGroup || null,
                permanentAddress: personal.permAddress || '',
                presentAddress: personal.presAddress || '',
                fathersName: personal.fatherName || '',
                fathersPhone: personal.fatherPhone || null,
                mothersName: personal.motherName || '',
                mothersPhone: personal.motherPhone || null,
                emergencyContactName: personal.emergencyName || '',
                emergencyRelationship: personal.emergencyRel || '',
                emergencyNumber: personal.emergencyPhone || null,

                ssc: {
                    educationType: 'SSC',
                    institutionName: education.ssc.institutionName.trim(),
                    hallTicketNumber: education.ssc.htNumber || '',
                    passoutYear: education.ssc.year ? parseInt(education.ssc.year) : null,
                    percentage: education.ssc.percentage ? parseFloat(education.ssc.percentage) : null
                },

                intermediate: {
                    educationType: 'INTERMEDIATE',
                    institutionName: education.inter.institutionName.trim(),
                    hallTicketNumber: education.inter.htNumber || '',
                    passoutYear: education.inter.year ? parseInt(education.inter.year) : null,
                    percentage: education.inter.percentage ? parseFloat(education.inter.percentage) : null
                },

                graduations: [
                    {
                        educationType: "GRADUATION",
                        institutionName: education.grad.institutionName.trim(),
                        hallTicketNumber: education.grad.htNumber || '',
                        passoutYear: education.grad.year ? parseInt(education.grad.year) : null,
                        percentage: education.grad.percentage ? parseFloat(education.grad.percentage) : null
                    }
                ],

                postGraduations: education.postGrad.map(pg => ({
                    educationType: "POST_GRADUATION",
                    institutionName: (pg.institutionName || pg.college || pg.school || '').trim(),
                    hallTicketNumber: pg.htNumber || '',
                    passoutYear: pg.year ? parseInt(pg.year) : null,
                    percentage: pg.percentage ? parseFloat(pg.percentage) : null
                })),

                panProof: {
                    panNumber: (documents.panNumber || '').replace(/\s+/g, '').toUpperCase() || ''
                },

                aadharProof: {
                    aadhaarNumber: (documents.aadharNumber || '').replace(/\s+/g, '') || ''
                },

                photoProof: { status: "PENDING" },
                passportProof: { status: "PENDING" },
                voterProof: { status: "PENDING" },

                bankDetails: {
                    bankName: bank.bankName || '',
                    branchName: bank.branchName || '',
                    accountNumber: bank.accountNumber || '',
                    ifscCode: bank.ifscCode || '',
                    documentType: bank.documentType || 'PASSBOOK',
                    upiId: bank.upiId || ''
                },

                workExperiences: experience.workHistory.map(work => ({
                    companyName: work.company || '',
                    yearsOfExperience: work.years ? parseInt(work.years) : 0
                })),

                internships: experience.internships.map(int => ({
                    companyName: int.company || '',
                    joiningDate: int.joining || null,
                    relievingDate: int.relieving || null,
                    internshipId: int.id || '',
                    duration: int.duration || ''
                })),

                otherCertificates: education.otherCerts.map(cert => ({
                    instituteName: cert.institute,
                    certificateNumber: cert.certNumber,
                    status: "PENDING"
                }))
            };

            // 🚀 IMPORTANT: Send as plain string, let Spring Boot handle it
            formData.append('data', JSON.stringify(onboardingData));

            // 2. Append Files separately with specific keys required by backend
            const isNewFile = (f) => f && !f.isServerFile && f instanceof File;
            const compress = (f) => isNewFile(f) ? compressFile(f) : Promise.resolve(null);

            const [
                panFile, aadharFile, photoFile, passportFile, voterFile,
                bankFile,
                sscCert, interCert, gradCert, gradMarks
            ] = await Promise.all([
                compress(documents.panCard),
                compress(documents.aadharCard),
                compress(documents.passportPhoto),
                compress(documents.passportDoc),
                compress(documents.voterId),
                compress(bank.docImage),
                compress(education.ssc.certificate),
                compress(education.inter.certificate),
                compress(education.grad.certificate),
                compress(education.grad.marksMemo)
            ]);

            // Identity
            if (photoFile) formData.append('photo', photoFile);
            if (panFile) formData.append('pan', panFile);
            if (aadharFile) formData.append('aadhaar', aadharFile);
            if (voterFile) formData.append('voter', voterFile);
            if (passportFile) formData.append('passport', passportFile);

            // Education
            if (sscCert) formData.append('ssc', sscCert);
            if (interCert) formData.append('intermediate', interCert);
            if (gradCert) formData.append('grad_certificate_0', gradCert);
            if (gradMarks) formData.append('grad_marks_0', gradMarks);

            education.postGrad.forEach((pg, i) => {
                if (isNewFile(pg.certificate)) {
                    formData.append(`postgrad_certificate_${i}`, pg.certificate);
                }
            });

            education.otherCerts.forEach((cert, i) => {
                if (isNewFile(cert.certificate)) {
                    formData.append(`certification_${i}`, cert.certificate);
                }
            });

            // Internship
            experience.internships.forEach((int, i) => {
                if (isNewFile(int.offerLetter)) formData.append(`internship_offer_${i}`, int.offerLetter);
                if (isNewFile(int.relievingLetter)) formData.append(`internship_certificate_${i}`, int.relievingLetter);
            });

            // Work Experience
            experience.workHistory.forEach((work, i) => {
                if (isNewFile(work.offerLetter)) formData.append(`experience_offer_${i}`, work.offerLetter);
                if (isNewFile(work.relievingLetter)) formData.append(`experience_reliev_${i}`, work.relievingLetter);
                if (isNewFile(work.payslips)) formData.append(`experience_payslip_${i}`, work.payslips);
                if (isNewFile(work.experienceCert)) formData.append(`experience_certificate_${i}`, work.experienceCert);
            });

            // Bank
            if (bankFile) formData.append('bank', bankFile);


            // Verification Logging
            console.log("🚀 [FORMDATA VERIFICATION] Final Payload:");
            for (let pair of formData.entries()) {
                console.log(`👉 ${pair[0]}:`, pair[1] instanceof File ? `File(${pair[1].name})` : pair[1]);
            }

            const response = await submitOnboarding(formData, [], submitToken);

            console.log("✅ Onboarding Submit Success:", response);
            setStep(7);
        } catch (error) {
            console.error("❌ Submission Failed:", error);
            alert(`Submission failed: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };
    // --- Render ---
    return (
        <div className="form-container">
            <div className="form-card">
                <div className="form-header">
                    <h1>Employee Onboarding</h1>
                    <p>Please fill out your details accurately.</p>
                </div>

                {loading && (
                    <div className="loading-overlay">
                        <div className="spinner"></div>
                        <p>Loading your details...</p>
                    </div>
                )}

                <div className="step-indicator">
                    <span className={step >= 1 ? 'active' : ''}>1. Personal</span>
                    <span className="line"></span>
                    <span className={step >= 2 ? 'active' : ''}>2. Education</span>
                    <span className="line"></span>
                    <span className={step >= 3 ? 'active' : ''}>3. Experience</span>
                    <span className="line"></span>
                    <span className={step >= 4 ? 'active' : ''}>4. Bank</span>
                    <span className="line"></span>
                    <span className={step >= 5 ? 'active' : ''}>5. Documents</span>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* SECTION 1: PERSONAL */}
                    {step === 1 && (
                        <div className="form-section animate-fade-in">
                            <h2>Personal Details</h2>
                            {personal.employeeCode && (
                                <div className="row">
                                    <Input label="Employee Code" name="employeeCode" val={personal.employeeCode} disabled />
                                </div>
                            )}
                            <div className="row">
                                <Input label="Full Name (as per Aadhar)" name="fullName" val={personal.fullName} fn={handlePersonalChange} req error={errors.fullName} rejected={isFieldRejected('fullName')} />
                                <Input label="Phone Number" name="phone" val={personal.phone} fn={handlePersonalChange} req type="tel" error={errors.phone} rejected={isFieldRejected('phone')} />
                            </div>
                            <div className="row">
                                <Input label="Email ID" name="email" val={personal.email} fn={handlePersonalChange} req type="email" error={errors.email} rejected={isFieldRejected('email')} />
                                <div className={`input-group ${errors.bloodGroup || isFieldRejected('bloodGroup') ? 'error' : ''}`}>
                                    <label>Blood Group {isFieldRejected('bloodGroup') && <span className="rejected-badge">Rejected</span>}</label>
                                    <select name="bloodGroup" value={personal.bloodGroup} onChange={handlePersonalChange} className={`form-input ${errors.bloodGroup || isFieldRejected('bloodGroup') ? 'error' : ''}`}>
                                        <option value="">Select</option>
                                        <option value="A+">A+</option>
                                        <option value="A-">A-</option>
                                        <option value="B+">B+</option>
                                        <option value="B-">B-</option>
                                        <option value="O+">O+</option>
                                        <option value="O-">O-</option>
                                        <option value="AB+">AB+</option>
                                        <option value="AB-">AB-</option>
                                    </select>
                                    {errors.bloodGroup && <span className="error-msg">{errors.bloodGroup}</span>}
                                    {isFieldRejected('bloodGroup') && <span className="error-msg">This field was rejected.</span>}
                                </div>
                                <Input label="Date of Birth" name="dateOfBirth" val={personal.dateOfBirth} fn={handlePersonalChange} req type="date" error={errors.dateOfBirth} rejected={isFieldRejected('dateOfBirth')} />
                            </div>

                            <h3>Address</h3>
                            <div className="row">
                                <div className={`input-group ${errors.permAddress || isFieldRejected('permanentAddress') ? 'error' : ''}`}>
                                    <label>Permanent Address {isFieldRejected('permanentAddress') && <span className="rejected-badge">Rejected</span>}</label>
                                    <textarea name="permAddress" value={personal.permAddress} onChange={handlePersonalChange} className={`form-input ${errors.permAddress || isFieldRejected('permanentAddress') ? 'error' : ''}`} required rows="3"></textarea>
                                    {errors.permAddress && <span className="error-msg">{errors.permAddress}</span>}
                                    {isFieldRejected('permanentAddress') && <span className="error-msg">This field was rejected.</span>}
                                </div>
                                <div className={`input-group ${errors.presAddress || isFieldRejected('presentAddress') ? 'error' : ''}`}>
                                    <label>Present Address {isFieldRejected('presentAddress') && <span className="rejected-badge">Rejected</span>}</label>
                                    <textarea name="presAddress" value={personal.presAddress} onChange={handlePersonalChange} className={`form-input ${errors.presAddress || isFieldRejected('presentAddress') ? 'error' : ''}`} required rows="3"></textarea>
                                    {errors.presAddress && <span className="error-msg">{errors.presAddress}</span>}
                                    {isFieldRejected('presentAddress') && <span className="error-msg">This field was rejected.</span>}
                                </div>
                            </div>

                            <h3>Family Details</h3>
                            <div className="row">
                                <Input label="Father's Name" name="fatherName" val={personal.fatherName} fn={handlePersonalChange} req error={errors.fatherName} rejected={isFieldRejected('fathersName')} />
                                {/* Optional: fatherPhone should not be HTML-required */}
                                <Input label="Father's Phone" name="fatherPhone" val={personal.fatherPhone} fn={handlePersonalChange} error={errors.fatherPhone} rejected={isFieldRejected('fathersPhone')} />
                            </div>
                            <div className="row">
                                <Input label="Mother's Name" name="motherName" val={personal.motherName} fn={handlePersonalChange} req error={errors.motherName} rejected={isFieldRejected('mothersName')} />
                                {/* Optional: motherPhone should not be HTML-required */}
                                <Input label="Mother's Phone" name="motherPhone" val={personal.motherPhone} fn={handlePersonalChange} error={errors.motherPhone} rejected={isFieldRejected('mothersPhone')} />
                            </div>

                            <h3>Emergency Contact</h3>
                            <div className="row">
                                <Input label="Contact Name" name="emergencyName" val={personal.emergencyName} fn={handlePersonalChange} req error={errors.emergencyName} rejected={isFieldRejected('emergencyContactName')} />
                                <Input label="Relationship" name="emergencyRel" val={personal.emergencyRel} fn={handlePersonalChange} req error={errors.emergencyRel} rejected={isFieldRejected('emergencyRelationship')} />
                            </div>
                            <div className="row">
                                <Input label="Emergency Number" name="emergencyPhone" val={personal.emergencyPhone} fn={handlePersonalChange} req error={errors.emergencyPhone} rejected={isFieldRejected('emergencyNumber')} />
                            </div>

                            <div className="form-actions right">
                                <button type="button" className="btn-primary" onClick={() => goToStep(2)}>Next <ChevronRight size={16} /></button>
                            </div>
                        </div>
                    )}

                    {/* SECTION 2: EDUCATION */}
                    {step === 2 && (
                        <div className="form-section animate-fade-in">
                            <h2>Education Details</h2>

                            <EducationBlock title="SSC" data={education.ssc} onChange={(f, v) => handleEduChange('ssc', f, v)} schoolLabel="School Name" req errors={errors} rejected={isFieldRejected('SSC')} />
                            <EducationBlock title="Intermediate" data={education.inter} onChange={(f, v) => handleEduChange('inter', f, v)} req errors={errors} rejected={isFieldRejected('Intermediate')} />
                            <EducationBlock title="Graduation" data={education.grad} onChange={(f, v) => handleEduChange('grad', f, v)} hasMarskMemo certLabel="Provisional Certificate" schoolLabel="College Name" req errors={errors} rejected={isFieldRejected('Graduation')} />

                            {/* Post Graduation */}
                            <div className="dynamic-section">
                                <div className="sec-head">
                                    <h3>Post Graduation</h3>
                                    <button type="button" className="btn-add" onClick={addPostGrad}><Plus size={14} /> Add</button>
                                </div>
                                {education.postGrad.map((pg, i) => (
                                    <div key={i} className="dynamic-card">
                                        <button type="button" className="btn-del" onClick={() => removePostGrad(i)}><Trash2 size={16} /></button>
                                        <div className="row">
                                            <Input label="College Name" val={pg.institutionName || ''} fn={(e) => updatePostGrad(i, 'institutionName', e.target.value)} />
                                            <Input label="Year" val={pg.year} fn={(e) => updatePostGrad(i, 'year', e.target.value)} />
                                        </div>
                                        <div className="row">
                                            <Input label="Percentage/CGPA" val={pg.percentage} fn={(e) => updatePostGrad(i, 'percentage', e.target.value)} />
                                            <FileInput
                                                label="Certificate"
                                                onChange={(file) => updatePostGrad(i, 'certificate', file)}
                                                fileName={pg.certificate?.name}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Other Certificates */}
                            <div className="dynamic-section">
                                <div className="sec-head">
                                    <h3>Other Certificates</h3>
                                    <button type="button" className="btn-add" onClick={addCert}><Plus size={14} /> Add</button>
                                </div>
                                {education.otherCerts.map((cert, i) => (
                                    <div key={i} className="dynamic-card">
                                        <button type="button" className="btn-del" onClick={() => removeCert(i)}><Trash2 size={16} /></button>
                                        <div className="row">
                                            <Input label="Institute Name" val={cert.institute} fn={(e) => updateCert(i, 'institute', e.target.value)} />
                                            <Input label="Certificate Number" val={cert.certNumber} fn={(e) => updateCert(i, 'certNumber', e.target.value)} />
                                        </div>
                                        <div className="row">
                                            <FileInput
                                                label="Upload Certificate (File/Image)"
                                                onChange={(file) => updateCert(i, 'certificate', file)}
                                                fileName={cert.certificate?.name}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="form-actions">
                                <button type="button" className="btn-secondary" onClick={() => goToStep(1)}><ChevronLeft size={16} /> Back</button>
                                <button type="button" className="btn-primary" onClick={() => goToStep(3)}>Next <ChevronRight size={16} /></button>
                            </div>
                        </div>
                    )}

                    {/* SECTION 3: EXPERIENCE */}
                    {step === 3 && (
                        <div className="form-section animate-fade-in">
                            <h2>Experience Details</h2>
                            {/* Internships */}
                            <div className="dynamic-section">
                                <div className="sec-head">
                                    <h3>Internships</h3>
                                    <button type="button" className="btn-add" onClick={addInternship}><Plus size={14} /> Add</button>
                                </div>
                                {experience.internships.map((int, i) => (
                                    <div key={i} className={`dynamic-card ${isFieldRejected('Internship') ? 'error' : ''}`}>
                                        <button type="button" className="btn-del" onClick={() => removeInternship(i)}><Trash2 size={16} /></button>
                                        <div className="row">
                                            <Input label="Company Name" val={int.company} fn={(e) => updateInternship(i, 'company', e.target.value)} rejected={isFieldRejected('Internship')} />
                                        </div>
                                        <div className="row">
                                            <Input type="date" label="Joining Date" val={int.joining} fn={(e) => updateInternship(i, 'joining', e.target.value)} rejected={isFieldRejected('Internship')} />
                                            <Input type="date" label="Relieving Date" val={int.relieving} fn={(e) => updateInternship(i, 'relieving', e.target.value)} rejected={isFieldRejected('Internship')} />
                                        </div>
                                        <div className="row">
                                            <Input label="Internship ID" val={int.id} fn={(e) => updateInternship(i, 'id', e.target.value)} rejected={isFieldRejected('Internship')} />
                                            <Input label="Duration (Months/Years)" val={int.duration} fn={(e) => updateInternship(i, 'duration', e.target.value)} rejected={isFieldRejected('Internship')} />
                                        </div>
                                        <div className="row">
                                            <FileInput
                                                label="Offer Letter"
                                                onChange={(file) => handleFileChange('experience', 'internships', 'offerLetter', file, i)}
                                                fileName={int.offerLetter?.name}
                                                rejected={isFieldRejected('Internship')}
                                            />
                                            <FileInput
                                                label="Experience Certificate"
                                                onChange={(file) => handleFileChange('experience', 'internships', 'relievingLetter', file, i)}
                                                fileName={int.relievingLetter?.name}
                                                rejected={isFieldRejected('Internship')}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Work History */}
                            <div className="dynamic-section">
                                <div className="sec-head">
                                    <h3>Work Experience</h3>
                                    <button type="button" className="btn-add" onClick={addWork}><Plus size={14} /> Add</button>
                                </div>
                                {experience.workHistory.map((work, i) => (
                                    <div key={i} className={`dynamic-card ${isFieldRejected('Work Experience') ? 'error' : ''}`}>
                                        <button type="button" className="btn-del" onClick={() => removeWork(i)}><Trash2 size={16} /></button>
                                        <div className="row">
                                            <Input label="Company Name" val={work.company} fn={(e) => updateWork(i, 'company', e.target.value)} rejected={isFieldRejected('Work Experience')} />
                                            <Input label="Years of Exp" val={work.years} fn={(e) => updateWork(i, 'years', e.target.value)} rejected={isFieldRejected('Work Experience')} />
                                        </div>
                                        <div className="row">
                                            <FileInput
                                                label="Offer Letter"
                                                onChange={(file) => updateWork(i, 'offerLetter', file)}
                                                fileName={work.offerLetter?.name}
                                                rejected={isFieldRejected('Work Experience')}
                                            />
                                            <FileInput
                                                label="Relieving Letter"
                                                onChange={(file) => updateWork(i, 'relievingLetter', file)}
                                                fileName={work.relievingLetter?.name}
                                                rejected={isFieldRejected('Work Experience')}
                                            />
                                        </div>
                                        <div className="row">
                                            <FileInput
                                                label="Payslips (Last 3 Months)"
                                                onChange={(file) => updateWork(i, 'payslips', file)}
                                                fileName={work.payslips?.name}
                                                rejected={isFieldRejected('Work Experience')}
                                            />
                                            <FileInput
                                                label="Experience Certificate"
                                                onChange={(file) => updateWork(i, 'experienceCert', file)}
                                                fileName={work.experienceCert?.name}
                                                rejected={isFieldRejected('Work Experience')}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="form-actions">
                                <button type="button" className="btn-secondary" onClick={() => goToStep(2)}><ChevronLeft size={16} /> Back</button>
                                <button type="button" className="btn-primary" onClick={() => goToStep(4)}>Next <ChevronRight size={16} /></button>
                            </div>
                        </div>
                    )}

                    {/* SECTION 4: BANK DETAILS */}
                    {step === 4 && (
                        <div className="form-section animate-fade-in">
                            <h2>Bank Details</h2>
                            <div className="row">
                                <Input label="Bank Name" name="bankName" val={bank.bankName} fn={handleBankChange} req error={errors.bankName} rejected={isFieldRejected('bankName')} />
                                <Input label="Branch Name" name="branchName" val={bank.branchName} fn={handleBankChange} req error={errors.branchName} rejected={isFieldRejected('branchName')} />
                            </div>
                            <div className="row">
                                <Input label="Account Number" name="accountNumber" val={bank.accountNumber} fn={handleBankChange} req error={errors.accountNumber} rejected={isFieldRejected('accountNumber')} />
                                <Input label="IFSC Code" name="ifscCode" val={bank.ifscCode} fn={handleBankChange} req error={errors.ifscCode} rejected={isFieldRejected('ifscCode')} />
                            </div>

                            <div className="row">
                                {/* Mandatory: UPI ID is required by backend */}
                                <Input label="UPI ID" name="upiId" val={bank.upiId} fn={handleBankChange} req error={errors.upiId} rejected={isFieldRejected('upiId')} />
                            </div>

                            <h3>Document Upload</h3>
                            <div className="row">
                                <div className={`input-group ${isFieldRejected('documentFilePath') ? 'error' : ''}`}>
                                    <label>Document Type {isFieldRejected('documentFilePath') && <span className="rejected-badge">Rejected</span>}</label>
                                    <select
                                        name="documentType"
                                        value={bank.documentType}
                                        onChange={handleBankChange}
                                        className={`form-input ${isFieldRejected('documentFilePath') ? 'error' : ''}`}
                                    >
                                        <option value="PASSBOOK">Passbook</option>
                                        <option value="BANK_STATEMENT">Bank Statement</option>
                                        <option value="CANCELLED_CHEQUE">Cancelled Cheque</option>
                                    </select>
                                    {isFieldRejected('documentFilePath') && <span className="error-msg">This document was rejected.</span>}
                                </div>
                                <FileInput
                                    label={`Upload Bank Document (Passbook/Statement/Cheque)`}
                                    onChange={(file) => handleFileChange('bank', null, 'docImage', file)}
                                    fileName={bank.docImage?.name}
                                    error={errors.bankDoc}
                                    req
                                    rejected={isFieldRejected('documentFilePath')}
                                />
                                {bank.uploading && <div className="upload-status loading">Uploading...</div>}
                                {bank.uploadSuccess && <div className="upload-status success">✓ Uploaded</div>}
                                {bank.uploadError && <div className="upload-status error">⚠ Upload Failed</div>}
                            </div>

                            <div className="form-actions">
                                <button type="button" className="btn-secondary" onClick={() => goToStep(3)}><ChevronLeft size={16} /> Back</button>
                                <button type="button" className="btn-primary" onClick={() => goToStep(5)}>Next <ChevronRight size={16} /></button>
                            </div>
                        </div>
                    )}

                    {/* SECTION 5: OTHER DOCUMENTS */}
                    {step === 5 && (
                        <div className="form-section animate-fade-in">
                            <h2>Other Documents</h2>

                            <h3>Identity Proofs</h3>
                            <div className="row">
                                <Input label="PAN Card Number" name="panNumber" val={documents.panNumber} fn={handleDocumentChange} req error={errors.panNumber} rejected={isFieldRejected('PAN')} />
                                <FileInput
                                    label={`Upload PAN Card`}
                                    onChange={(file) => handleFileChange('documents', null, 'panCard', file)}
                                    fileName={documents.panCard?.name}
                                    req
                                    error={errors.panCard}
                                    rejected={isFieldRejected('PAN')}
                                />
                            </div>

                            <div className="row">
                                <Input label="Aadhar Card Number" name="aadharNumber" val={documents.aadharNumber} fn={handleDocumentChange} req error={errors.aadharNumber} rejected={isFieldRejected('AADHAR')} />
                                <FileInput
                                    label={`Upload Aadhar Card`}
                                    onChange={(file) => handleFileChange('documents', null, 'aadharCard', file)}
                                    fileName={documents.aadharCard?.name}
                                    req
                                    error={errors.aadharCard}
                                    rejected={isFieldRejected('AADHAR')}
                                />
                            </div>

                            <h3>Photos & Other IDs</h3>
                            <div className="row">
                                <FileInput
                                    label="Passport Size Photo"
                                    onChange={(file) => handleFileChange('documents', null, 'passportPhoto', file)}
                                    fileName={documents.passportPhoto?.name}
                                    req
                                    error={errors.passportPhoto}
                                    rejected={isFieldRejected('PHOTO')}
                                />
                                <FileInput
                                    label="Passport Document (Optional)"
                                    onChange={(file) => handleFileChange('documents', null, 'passportDoc', file)}
                                    fileName={documents.passportDoc?.name}
                                    rejected={isFieldRejected('PASSPORT')}
                                />
                            </div>

                            <div className="row">
                                <FileInput
                                    label="Voter ID Card (Optional)"
                                    onChange={(file) => handleFileChange('documents', null, 'voterId', file)}
                                    fileName={documents.voterId?.name}
                                    rejected={isFieldRejected('VOTER')}
                                />
                            </div>

                            <div className="form-actions">
                                <button type="button" className="btn-secondary" onClick={() => goToStep(4)}><ChevronLeft size={16} /> Back</button>
                                <button
                                    type="submit"
                                    className="btn-submit"
                                    disabled={loading}
                                >
                                    {loading ? 'Submitting Application...' : 'Submit Application'} <CheckCircle size={16} />
                                </button>
                            </div>
                            {loading && (
                                <div className="upload-warning">
                                    <div className="spinner-small"></div>
                                    <span>Please wait while we submit your application...</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* SECTION 7: SUCCESS */}
                    {step === 7 && (
                        <div className="form-section animate-fade-in success-section">
                            <div className="success-icon">
                                <CheckCircle size={64} color="#1e8e3e" />
                            </div>
                            <h2>Onboarding Completed</h2>
                            <p>Your details have been submitted successfully. HR will review your application soon.</p>
                            <div className="form-actions center">
                                <button type="button" className="btn-primary" onClick={() => window.location.reload()}>Finish</button>
                            </div>
                        </div>
                    )}
                </form>
            </div>

            <style>{`
                .form-container {
                    min-height: 100vh;
                    background: #f0f2f5;
                    padding: 2rem;
                    display: flex;
                    justify-content: center;
                    font-family: 'Inter', sans-serif;
                }

                .form-card {
                    background: white;
                    width: 100%;
                    max-width: 900px;
            margin: 2rem auto;
                    border-radius: 8px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24);
                    overflow: hidden;
                    position: relative;
                }

                .form-header {
                    padding: 2rem 2rem 1rem;
                    border-bottom: 1px solid #e0e0e0;
                }

                .form-header h1 {
                    font-size: 2rem;
                    color: #202124;
                    margin: 0 0 0.5rem 0;
                }

                .form-header p {
                    color: #5f6368;
                    font-size: 0.9rem;
                }

                .step-indicator {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 1rem;
                    background: #f8f9fa;
                    border-bottom: 1px solid #e0e0e0;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                }

                .step-indicator span:not(.line) {
                    font-size: 0.85rem;
                    font-weight: 600;
                    color: #bdc1c6;
                    padding: 0.25rem 0.5rem;
                    border-radius: 4px;
                    white-space: nowrap;
                }

                .step-indicator span.active {
                    color: #673ab7;
                    background: #ede7f6;
                }

                .step-indicator .line {
                    height: 1px;
                    width: 20px;
                    background: #dadce0;
                    margin: 0;
                    flex-shrink: 0;
                }

                .form-section {
                    padding: 2rem;
                }

                .form-section h2 {
                    font-size: 1.25rem;
                    color: #202124;
                    margin-bottom: 1.5rem;
                    padding-bottom: 0.5rem;
                    border-bottom: 2px solid #673ab7;
                    display: inline-block;
                }

                .form-section h3 {
                    font-size: 1rem;
                    color: #3c4043;
                    margin-top: 1.5rem;
                    margin-bottom: 1rem;
                    font-weight: 600;
                }

                .row {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 1.5rem;
                    margin-bottom: 1rem;
                }
 
                .input-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
 
                .input-group.full {
                    grid-column: span 2;
                }

                .input-group label {
                    font-size: 0.85rem;
                    font-weight: 500;
                    color: #202124;
                }

                .form-input {
                    width: 100%;
                    max-width: 100%;
                    padding: 0.75rem;
                    border: 1px solid #dadce0;
                    border-radius: 4px;
                    font-size: 0.9rem;
                    transition: all 0.2s;
                    box-sizing: border-box;
                }
 
                .form-input.error {
                    border-color: #d93025;
                    background-color: #fdf4f4;
                }
 
                .error-msg {
                    color: #d93025;
                    font-size: 0.75rem;
                    margin-top: 0.25rem;
                }
 
                .file-upload-box.error {
                    border: 2px dashed #d93025;
                    background-color: #fdf4f4;
                }

                .form-input:focus {
                    outline: none;
                    border-color: #673ab7;
                    border-width: 2px;
                    margin: -1px; /* visual fix for width jump */
                    margin-bottom: 0px;
                }

                .form-input:disabled {
                    background-color: #f1f3f4;
                    color: #5f6368;
                    cursor: not-allowed;
                    border-color: #e0e0e0;
                }

                .file-upload-box {
                    border: 1px dashed #dadce0;
                    padding: 1rem;
                    border-radius: 4px;
                    text-align: center;
                    color: #5f6368;
                    font-size: 0.85rem;
                    cursor: pointer;
                    transition: background 0.2s;
                }

                .file-upload-box:hover {
                    background: #f1f3f4;
                }

                /* Education Block */
                .edu-block {
                    background: #f8f9fa;
                    padding: 1rem;
                    border-radius: 8px;
                    margin-bottom: 1rem;
                    border: 1px solid #e0e0e0;
                }

                /* Dynamic Section */
                .dynamic-section {
                    margin-bottom: 2rem;
                }

                .sec-head {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1rem;
                }

                .dynamic-card {
                    background: #fff;
                    border: 1px solid #dadce0;
                    padding: 1.5rem;
                    border-radius: 8px;
                    margin-bottom: 1rem;
                    position: relative;
                }

                .btn-add {
                    display: flex;
                    align-items: center;
                    gap: 0.25rem;
                    background: #e8f0fe;
                    color: #1a73e8;
                    border: none;
                    padding: 0.5rem 1rem;
                    border-radius: 20px;
                    cursor: pointer;
                    font-size: 0.8rem;
                    font-weight: 600;
                }

                .btn-del {
                    position: absolute;
                    top: 1rem;
                    right: 1rem;
                    background: none;
                    border: none;
                    color: #d93025;
                    cursor: pointer;
                    opacity: 0.6;
                }

                .btn-del:hover {
                    opacity: 1;
                }

                /* Actions */
                .form-actions {
                    display: flex;
                    justify-content: space-between;
                    margin-top: 2rem;
                    padding-top: 1rem;
                    border-top: 1px solid #e0e0e0;
                }

                .form-actions.right {
                    justify-content: flex-end;
                }

                .upload-status {
                    font-size: 0.75rem;
                    margin-top: 0.25rem;
                    font-weight: 500;
                }
                .upload-status.loading { color: #1a73e8; }
                .upload-status.success { color: #1e8e3e; }
                .upload-status.error { color: #d93025; }

                .btn-primary, .btn-secondary, .btn-submit {
                    padding: 0.75rem 1.5rem;
                    border-radius: 4px;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    border: none;
                }

                .btn-primary {
                    background: #673ab7;
                    color: white;
                }

                .btn-secondary {
                    background: white;
                    color: #673ab7;
                    border: 1px solid #dadce0;
                }

                .btn-submit {
                    background: #1e8e3e;
                    color: white;
                }

                .animate-fade-in {
                    animation: fadeIn 0.4s ease-out;
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .rejected-badge {
                    background: #fdf4f4;
                    color: #d93025;
                    font-size: 0.7rem;
                    font-weight: 700;
                    padding: 2px 6px;
                    border-radius: 4px;
                    border: 1px solid #d93025;
                    text-transform: uppercase;
                    margin-left: 0.5rem;
                }

                .loading-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(255, 255, 255, 0.8);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    z-index: 100;
                    border-radius: 12px;
                }

                .spinner {
                    width: 40px;
                    height: 40px;
                    border: 4px solid #f3f3f3;
                    border-top: 4px solid #2563eb;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin-bottom: 1rem;
                }

                .review-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 1.5rem;
                    background: #f8f9fa;
                    padding: 1.5rem;
                    border-radius: 8px;
                    border: 1px solid #e0e0e0;
                    margin-bottom: 2rem;
                }

                .review-item {
                    font-size: 0.9rem;
                    color: #202124;
                }

                .review-section-title {
                    grid-column: span 2;
                    font-weight: 700;
                    color: #673ab7;
                    font-size: 0.95rem;
                    border-bottom: 1px solid #e0e0e0;
                    padding-bottom: 0.25rem;
                    margin-top: 0.5rem;
                }

                .review-section-title.full {
                    grid-column: span 2;
                }

                .success-text { color: #1e8e3e; font-weight: 600; font-size: 0.8rem; }
                .error-text { color: #d93025; font-weight: 600; font-size: 0.8rem; }

                .upload-warning {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    background: #fff3e0;
                    padding: 1rem;
                    border-radius: 4px;
                    margin-top: 1rem;
                    color: #e65100;
                    font-size: 0.85rem;
                }

                .spinner-small {
                    width: 16px;
                    height: 16px;
                    border: 2px solid #e65100;
                    border-top: 2px solid transparent;
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                .success-section {
                    text-align: center;
                    padding: 4rem 2rem;
                }

                .success-icon {
                    display: flex;
                    justify-content: center;
                    margin-bottom: 1.5rem;
                }

                .success-section h2 {
                    color: #1e8e3e;
                    border-color: #1e8e3e;
                    font-size: 1.75rem;
                }

                .success-section p {
                    color: #5f6368;
                    font-size: 1rem;
                    max-width: 480px;
                    margin: 0 auto 2rem;
                }

                .form-actions.center {
                    justify-content: center;
                }

                @media (max-width: 600px) {
                    .row { grid-template-columns: 1fr; gap: 1rem; }
                    .form-container { padding: 1rem 0.5rem; }
                    .input-group.full { grid-column: span 1; }
                }
            `}</style>
        </div >
    );
};

const Input = ({ label, name, val, fn, req, type = "text", error, rejected, disabled }) => (
    <div className={`input-group ${error || rejected ? 'error' : ''} ${disabled ? 'disabled' : ''}`}>
        <label>
            {label} {req && <span style={{ color: 'red' }}>*</span>}
            {rejected && <span className="rejected-badge">Rejected</span>}
        </label>
        <input
            type={type}
            name={name}
            value={val || ''}
            onChange={fn}
            required={req}
            disabled={disabled}
            className={`form-input ${error || rejected ? 'error' : ''}`}
        />
        {error && <span className="error-msg">{error}</span>}
        {rejected && <span className="error-msg">This field was rejected. Please update it.</span>}
    </div>
);

const FileInput = ({ label, onChange, fileName, req, error, rejected }) => {
    const fileRef = React.useRef(null);

    return (
        <div className={`input-group ${error || rejected ? 'error' : ''}`}>
            <label>
                {label} {req && <span style={{ color: 'red' }}>*</span>}
                {rejected && <span className="rejected-badge">Rejected</span>}
            </label>
            <div className={`file-upload-box ${error || rejected ? 'error' : ''}`} onClick={() => fileRef.current.click()}>
                <input
                    type="file"
                    ref={fileRef}
                    style={{ display: 'none' }}
                    accept="image/*"
                    onChange={(e) => onChange(e.target.files[0])}
                />
                <Upload size={18} style={{ marginBottom: '0.25rem' }} />
                <div>{fileName ? fileName : 'Click to upload file'}</div>
            </div>
            {error && <span className="error-msg">{error}</span>}
            {rejected && <span className="error-msg">This document was rejected. Please re-upload.</span>}
        </div>
    );
};

const EducationBlock = ({ title, data, onChange, hasMarskMemo, schoolLabel = "School/College Name", certLabel, req, errors = {}, rejected }) => {
    const levelKey = title.toLowerCase().includes('ssc') ? 'ssc' : title.toLowerCase().includes('inter') ? 'inter' : 'grad';

    return (
        <div className={`edu-block ${rejected ? 'error' : ''}`}>
            <h3>{title} {rejected && <span className="rejected-badge">Rejected</span>}</h3>
            <div className="row">
                <Input
                    label={schoolLabel}
                    val={data.institutionName || ''}
                    fn={(e) => onChange('institutionName', e.target.value)}
                    req={req}
                    error={errors[`${levelKey}_institutionName`]}
                />
                <Input
                    label="Hall Ticket No."
                    val={data.htNumber}
                    fn={(e) => onChange('htNumber', e.target.value)}
                    req={req}
                    error={errors[`${levelKey}_htNumber`]}
                />
            </div>
            <div className="row">
                <Input
                    label="Passout Year"
                    type="number"
                    val={data.year}
                    fn={(e) => onChange('year', e.target.value)}
                    req={req}
                    error={errors[`${levelKey}_year`]}
                    rejected={rejected}
                />
                <Input
                    label="Percentage/CGPA"
                    val={data.percentage}
                    fn={(e) => onChange('percentage', e.target.value)}
                    req={req}
                    error={errors[`${levelKey}_percentage`]}
                    rejected={rejected}
                />
            </div>
            <div className="row">
                <FileInput
                    label={certLabel || `${title} Certificate`}
                    onChange={(file) => onChange('certificate', file)}
                    fileName={data.certificate?.name}
                    req={req}
                    error={errors[`${levelKey}_certificate`]}
                    rejected={rejected}
                />
                {hasMarskMemo && (
                    <FileInput
                        label="Marks Memo"
                        onChange={(file) => onChange('marksMemo', file)}
                        fileName={data.marksMemo?.name}
                        req={req}
                        rejected={rejected}
                    />
                )}
            </div>
        </div>
    );
};

const WebcamCapture = ({ onCapture, initialImg }) => {
    const videoRef = React.useRef(null);
    const canvasRef = React.useRef(null);
    const [stream, setStream] = React.useState(null);
    const [capturedImg, setCapturedImg] = React.useState(initialImg);
    const [error, setError] = React.useState(null);

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
            setError(null);
        } catch (err) {
            console.error("Camera access error:", err);
            setError("Could not access camera. Please ensure permissions are granted.");
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    const capturePhoto = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (video && canvas) {
            const context = canvas.getContext('2d');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = canvas.toDataURL('image/jpeg');
            setCapturedImg(imageData);
            onCapture(imageData);
            stopCamera();
        }
    };

    const reset = () => {
        setCapturedImg(null);
        onCapture(null);
        startCamera();
    };

    React.useEffect(() => {
        if (!capturedImg) {
            startCamera();
        }
        return () => stopCamera();
    }, []);

    return (
        <div className="webcam-container">
            {!capturedImg ? (
                <div className="video-wrapper">
                    <video ref={videoRef} autoPlay playsInline muted className="webcam-video" />
                    <div className="video-overlay"></div>
                    <button type="button" className="btn-capture" onClick={capturePhoto}>
                        <div className="inner-circle"></div>
                    </button>
                    {error && <div className="webcam-error">{error}</div>}
                </div>
            ) : (
                <div className="preview-wrapper">
                    <img src={capturedImg} alt="Captured" className="captured-img" />
                    <button type="button" className="btn-retake" onClick={reset}>
                        Retake Photo
                    </button>
                </div>
            )}
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            <style>{`
                .webcam-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 1rem;
                    width: 100%;
                    max-width: 500px;
                    margin: 0 auto;
                }
                .video-wrapper, .preview-wrapper {
                    position: relative;
                    width: 100%;
                    aspect-ratio: 4/3;
                    background: #000;
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                }
                .webcam-video, .captured-img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .video-overlay {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 250px;
                    height: 250px;
                    border: 2px dashed rgba(255,255,255,0.5);
                    border-radius: 50%;
                    pointer-events: none;
                }
                .btn-capture {
                    position: absolute;
                    bottom: 1.5rem;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 64px;
                    height: 64px;
                    border-radius: 50%;
                    background: rgba(255,255,255,0.3);
                    border: 4px solid #fff;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: transform 0.2s;
                }
                .btn-capture:hover {
                    transform: translateX(-50%) scale(1.05);
                }
                .inner-circle {
                    width: 48px;
                    height: 48px;
                    background: #fff;
                    border-radius: 50%;
                }
                .btn-retake {
                    position: absolute;
                    bottom: 1rem;
                    right: 1rem;
                    background: rgba(0,0,0,0.6);
                    color: #fff;
                    border: none;
                    padding: 0.5rem 1rem;
                    border-radius: 4px;
                    font-size: 0.8rem;
                    cursor: pointer;
                }
                .webcam-error {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    color: #ff5252;
                    text-align: center;
                    padding: 1rem;
                    background: rgba(0,0,0,0.8);
                    width: 80%;
                    border-radius: 8px;
                }
            `}</style>
        </div>
    );
};

export default EmployeeOnboardingForm;
