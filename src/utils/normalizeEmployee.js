/**
 * normalizeEmployee.js
 *
 * ═══════════════════════════════════════════════════════════════════
 * SINGLE SOURCE OF TRUTH — API CONTRACT ENFORCER
 * ═══════════════════════════════════════════════════════════════════
 *
 * This module is the ONLY place that translates raw backend responses
 * into the flat shape the frontend uses. No component should ever
 * access raw backend field names directly.
 */

// ─── HELPERS ─────────────────────────────────────────────────────

function safeCopy(value, seen = new WeakSet()) {
    if (value === null || typeof value !== 'object') return value;
    if (seen.has(value)) return null;
    seen.add(value);

    if (Array.isArray(value)) {
        return value.map(v => safeCopy(v, seen));
    }

    const result = {};
    for (const key in value) {
        if (['employeeForm', 'onboardingForm'].includes(key)) continue;
        result[key] = safeCopy(value[key], seen);
    }
    return result;
}

export const formatDate = (date) => {
    if (!date) return '';
    if (Array.isArray(date)) {
        const [year, month, day] = date;
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    if (typeof date === 'string') {
        if (date.includes('T')) return date.split('T')[0];
        return date;
    }
    return String(date);
};

export const formatDateTime = (date) => {
    if (!date) return { date: '', time: '' };
    if (Array.isArray(date)) {
        const [year, month, day, hour, minute] = date;
        return {
            date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
            time: `${String(hour || 0).padStart(2, '0')}:${String(minute || 0).padStart(2, '0')}`
        };
    }
    if (typeof date === 'string') {
        const parts = date.split(/[T ]/);
        return {
            date: parts[0] || '',
            time: parts[1] ? parts[1].substring(0, 5) : ''
        };
    }
    return { date: '', time: '' };
};

const extractName = (val, ...nameKeys) => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
        for (const key of nameKeys) {
            if (val[key] && typeof val[key] === 'string') return val[key];
        }
    }
    return '';
};

export const scavengeValue = (obj, ...paths) => {
    if (!obj || typeof obj !== 'object') return null;

    for (const path of paths) {
        if (typeof path === 'string' && path.includes('.')) {
            const parts = path.split('.');
            let current = obj;
            for (const part of parts) {
                current = (current && typeof current === 'object') ? current[part] : undefined;
            }
            if (current !== undefined && current !== null) return current;
            continue;
        }

        if (obj[path] !== undefined && obj[path] !== null) {
            return obj[path];
        }
    }
    return null;
};

export const scavengePath = (obj, ...paths) => {
    const val = scavengeValue(obj, ...paths);
    if (!val || typeof val !== 'string') return null;
    const trimmed = val.trim();
    if (trimmed === 'NOT_UPLOADED' || trimmed === 'null' || trimmed === '' || trimmed === 'undefined') return null;
    return trimmed;
};

export const findProof = (proofs, targetType) => {
    if (!Array.isArray(proofs)) return null;
    const target = targetType.toUpperCase();
    return proofs.find(p => {
        const type = ((p.type || p.proofType) || '').toUpperCase();
        return type === target;
    });
};

/**
 * Generic helper to find a record in an array by a type key (case-insensitive).
 */
export const findInArray = (list, typeKey, targetType) => {
    if (!Array.isArray(list)) return null;
    const target = targetType.toUpperCase();
    return list.find(item => {
        const val = (item[typeKey] || '').toString().toUpperCase();
        return val === target;
    });
};

/**
 * Maps DB snake_case fields for Education to frontend camelCase.
 */
export const normalizeEducationRecord = (raw) => {
    if (!raw) return null;
    return {
        ...raw,
        institutionName: raw.institutionName || raw.institution_name || raw.school || raw.college || "",
        passoutYear: raw.passoutYear || raw.passout_year || "",
        percentageCgpa: raw.percentage || raw.percentageCgpa || raw.percentage_cgpa || "",
        hallTicketNo: raw.hallTicketNumber || raw.hallTicketNo || raw.hall_ticket_number || "",
        certificatePath: raw.certificatePath || raw.certificate_file_path || null,
        marksMemoPath: raw.marksMemoPath || raw.marks_memo_file_path || null
    };
};

/**
 * Maps DB snake_case fields for Internship to frontend camelCase.
 */
export const normalizeInternshipRecord = (raw) => {
    if (!raw) return null;
    return {
        ...raw,
        companyName: raw.company_name || raw.companyName || "",
        startDate: formatDate(raw.start_date || raw.startDate),
        endDate: formatDate(raw.end_date || raw.endDate),
        offerLetterPath: scavengePath(raw, 'offer_letter_file_path', 'offerLetterPath'),
        experienceCertificatePath: scavengePath(raw, 'experience_certificate_file_path', 'experienceCertificatePath')
    };
};

/**
 * Maps DB snake_case fields for Work Experience to frontend camelCase.
 */
export const normalizeWorkExperienceRecord = (raw) => {
    if (!raw) return null;
    return {
        ...raw,
        companyName: raw.companyName || raw.company_name || "",
        jobTitle: raw.jobTitle || raw.job_title || "",
        startDate: formatDate(raw.startDate || raw.start_date),
        endDate: formatDate(raw.endDate || raw.end_date),
        yearsOfExp: raw.yearsOfExperience || raw.yearsOfExp || "",
        ctc: raw.ctc || "",
        offerLetterPath: scavengePath(raw, 'offerLetterPath', 'offer_letter_file_path'),
        relievingLetterPath: scavengePath(raw, 'relievingLetterPath', 'relieving_letter_file_path'),
        payslipsPath: scavengePath(raw, 'payslipsPath', 'payslips_file_path'),
        experienceCertificatePath: scavengePath(raw, 'experienceCertificatePath', 'experience_certificate_file_path')
    };
};

/**
 * Maps DB snake_case fields for Identity Proofs to frontend camelCase.
 */
export const normalizeProofRecord = (raw) => {
    if (!raw) return null;
    return {
        ...raw,
        proofType: raw.proof_type || raw.proofType || raw.type || "",
        idNumber: raw.id_number || raw.idNumber || raw.panNumber || raw.aadhaarNumber || "",
        filePath: scavengePath(raw, 'file_path', 'filePath')
    };
};

// ─── MAIN NORMALIZER ─────────────────────────────────────────────

export const normalizeEmployee = (rawEmp) => {
    if (!rawEmp || typeof rawEmp !== 'object') return null;

    // Step 1: Deep copy to handle potential mutations/circularity
    let emp = safeCopy(rawEmp);

    // Step 2: Auto-Pivot for wrapped responses
    if (!emp.fullName && !emp.name && (emp.employee || emp.data || emp.onboarding)) {
        const nested = emp.employee || emp.data || emp.onboarding;
        if (nested && typeof nested === 'object') {
            // Merge nested data into root to preserve root-level metadata (like createdAt)
            emp = { ...emp, ...nested };
        }
    }

    // Step 2b: Merge sibling onboarding wrapper to root so nested fields (ssc, internships) become accessible
    if (emp.onboardingForm && typeof emp.onboardingForm === 'object') {
        emp = { ...emp.onboardingForm, ...emp };
    } else if (emp.onboarding && typeof emp.onboarding === 'object' && !emp.onboarding.status) {
        // Only merge if it's actually an onboarding data object, not a string or status
        emp = { ...emp.onboarding, ...emp };
    }

    // Step 3: Identity Discovery (Array of proofs)
    const identityProofs = Array.isArray(emp?.identityProofs) ? emp.identityProofs : 
                          (Array.isArray(emp?.employee?.identityProofs) ? emp.employee.identityProofs : []);

    // Step 4: Map fields via Scavenging
    const res = {
        // Basic Info
        id: (emp?.id || emp?.employeeId) ?? null,
        employeeId: (emp?.id || emp?.employeeId) ?? null,
        empId: emp?.empId ?? "",
        empCode: scavengeValue(emp, 'empCode', 'employeeCode', 'employee.empCode', 'employee.employeeCode') ?? "",
        name: scavengeValue(emp, 'fullName', 'name', 'personal.fullName', 'employee.fullName', 'personalDetails.fullName') ?? "Unknown",
        email: scavengeValue(emp, 'email', 'personal.email', 'employee.email', 'personalDetails.email') ?? "",
        phone: scavengeValue(emp, 'phone', 'phoneNumber', 'personal.phoneNumber', 'employee.phone', 'personalDetails.phoneNumber') ?? "",

        // Dept/Role/Entity
        deptName: scavengeValue(emp, 'deptName', 'departmentName', 'dept.deptName', 'employee.deptName') || 
                  extractName(emp?.dept, 'deptName', 'departmentName') || 
                  extractName(emp?.department, 'deptName', 'departmentName') || "None",
        roleName: scavengeValue(emp, 'roleName', 'role.roleName', 'employee.roleName') || 
                  extractName(emp?.role, 'roleName') || "None",
        entityName: scavengeValue(emp, 'entityName', 'entity.entityName', 'employee.entityName') || 
                    extractName(emp?.entity, 'entityName') || "None",

        // Status & Dates
        status: (typeof emp?.status === 'string' ? emp.status : scavengeValue(emp, 'status', 'employee.status')) || "UNKNOWN",
        onboardingStatus: emp?.onboarding?.status || emp?.onboardingStatus || "NOT_STARTED",
        onboardingDate: formatDate(scavengeValue(emp, 'dateOfOnboarding', 'onboardingDate', 'employee.dateOfOnboarding', 'onboarding.onboardingDate')),
        dateOfInterview: formatDate(scavengeValue(emp, 'dateOfInterview', 'interviewDate', 'employee.dateOfInterview')),
        dateOfBirth: formatDate(scavengeValue(emp, 'dateOfBirth', 'dob', 'personal.dateOfBirth', 'employee.dateOfBirth', 'personalDetails.dateOfBirth')),
        createdAt: formatDateTime(scavengeValue(emp, 'createdAt', 'employee.createdAt', 'onboarding.createdAt', 'metadata.createdAt')),

        // Identity
        panNumber: scavengeValue(emp, 'panNumber', 'panProof.panNumber', 'employee.panNumber', 'identityProof.panNumber', 'personal.panNumber') ||
                  findProof(identityProofs, 'PAN')?.panNumber || "",
        aadharNumber: scavengeValue(emp, 'aadharNumber', 'aadhaarNumber', 'aadharProof.aadhaarNumber', 'panProof.aadhaarNumber', 'employee.aadhaarNumber', 'identityProof.aadhaarNumber', 'personal.aadharNumber') ||
                     findProof(identityProofs, 'AADHAR')?.aadhaarNumber || "",
        
        // Paths
        photoPath: scavengePath(emp, 'photoPath', 'photoProof.filePath', 'panProof.photoFilePath', 'personal.photoPath', 'employee.photoPath') || scavengePath(findProof(identityProofs, 'PHOTO'), 'filePath', 'file_path') || null,
        panPath: scavengePath(emp, 'panPath', 'panProof.filePath', 'panProof.panFilePath', 'employee.panPath', 'identityProof.panFilePath') || scavengePath(findProof(identityProofs, 'PAN'), 'filePath', 'file_path') || null,
        aadharPath: scavengePath(emp, 'aadharPath', 'aadhaarPath', 'aadharProof.filePath', 'panProof.aadhaarFilePath', 'employee.aadharPath', 'identityProof.aadhaarFilePath') || scavengePath(findProof(identityProofs, 'AADHAR'), 'filePath', 'file_path') || null,
        passbookPath: scavengePath(emp, 'passbookPath', 'bankDetails.documentFilePath', 'bankDetails.filePath', 'employee.bankDetails.documentFilePath', 'bankProof.documentFilePath', 'bankDocumentPath') || scavengePath(emp?.bankDetails, 'filePath', 'file_path') || null,
        passportPath: scavengePath(emp, 'passportPath', 'passportProof.filePath', 'panProof.passportFilePath', 'employee.passportPath') || scavengePath(findProof(identityProofs, 'PASSPORT'), 'filePath', 'file_path') || null,
        voterPath: scavengePath(emp, 'voterPath', 'voterProof.filePath', 'panProof.voterIdFilePath', 'employee.voterPath', 'voterIdFilePath') || scavengePath(findProof(identityProofs, 'VOTER'), 'filePath', 'file_path') || null,

        // Personal
        bloodGroup: scavengeValue(emp, 'bloodGroup', 'personal.bloodGroup', 'employee.bloodGroup', 'personalDetails.bloodGroup') ?? "",
        fathersName: scavengeValue(emp, 'fathersName', 'fatherName', 'personal.fathersName', 'employee.fathersName', 'personalDetails.fathersName') ?? "",
        fathersPhone: scavengeValue(emp, 'fathersPhone', 'fatherPhone', 'personal.fathersPhone', 'employee.fathersPhone', 'personalDetails.fathersPhone') ?? "",
        mothersName: scavengeValue(emp, 'mothersName', 'motherName', 'personal.mothersName', 'employee.mothersName', 'personalDetails.mothersName') ?? "",
        mothersPhone: scavengeValue(emp, 'mothersPhone', 'motherPhone', 'personal.mothersPhone', 'employee.mothersPhone', 'personalDetails.mothersPhone') ?? "",
        emergencyContactName: scavengeValue(emp, 'emergencyContactName', 'emergencyName', 'personal.emergencyContactName', 'employee.emergencyContactName') ?? "",
        emergencyRelationship: scavengeValue(emp, 'emergencyRelationship', 'emergencyRel', 'personal.emergencyRelationship', 'employee.emergencyRelationship') ?? "",
        emergencyNumber: scavengeValue(emp, 'emergencyNumber', 'emergencyPhone', 'personal.emergencyNumber', 'employee.emergencyNumber') ?? "",

        // Bank
        bankName: scavengeValue(emp, 'bankName', 'bankDetails.bankName', 'employee.bankDetails.bankName') ?? "",
        branchName: scavengeValue(emp, 'branchName', 'bankDetails.branchName', 'employee.bankDetails.branchName') ?? "",
        ifscCode: scavengeValue(emp, 'ifscCode', 'bankDetails.ifscCode', 'employee.bankDetails.ifscCode') ?? "",
        accountNumber: scavengeValue(emp, 'accountNumber', 'bankDetails.accountNumber', 'employee.bankDetails.accountNumber') ?? "",
        upiId: scavengeValue(emp, 'upiId', 'bankDetails.upiId', 'employee.bankDetails.upiId') ?? "",
        bankProof: emp?.bankProof ?? emp?.bankDetails ?? emp?.employee?.bankDetails ?? null,

        // Address
        presentAddress: scavengeValue(emp, 'presentAddress', 'presAddress', 'personal.presentAddress', 'employee.presentAddress') ?? "",
        permanentAddress: scavengeValue(emp, 'permanentAddress', 'permAddress', 'personal.permanentAddress', 'employee.permanentAddress') ?? "",

        // Education & Lists
        ssc: normalizeEducationRecord(scavengeValue(emp, 'ssc', 'education.ssc') || findInArray(emp?.educations || emp?.educationHistory, 'education_type', 'SSC') || findInArray(emp?.educations || emp?.educationHistory, 'educationType', 'SSC')),
        intermediate: normalizeEducationRecord(scavengeValue(emp, 'intermediate', 'education.intermediate') || findInArray(emp?.educations || emp?.educationHistory, 'education_type', 'INTERMEDIATE') || findInArray(emp?.educations || emp?.educationHistory, 'educationType', 'INTERMEDIATE')),
        graduation: normalizeEducationRecord(scavengeValue(emp, 'graduation', 'education.graduation') || (Array.isArray(emp?.graduations) ? emp.graduations[0] : null) || findInArray(emp?.educations || emp?.educationHistory, 'education_type', 'GRADUATION') || findInArray(emp?.educations || emp?.educationHistory, 'educationType', 'GRADUATION')),
        postGraduations: (() => {
            const list = Array.isArray(emp?.postGraduations) ? emp.postGraduations : (Array.isArray(emp?.education?.postGraduations) ? emp.education.postGraduations : []);
            if (list.length > 0) return list.map(normalizeEducationRecord);
            const eduArr = Array.isArray(emp?.educations) ? emp.educations : (Array.isArray(emp?.educationHistory) ? emp.educationHistory : (Array.isArray(emp?.education) ? emp.education : []));
            return eduArr.filter(e => (e.education_type || e.educationType) === 'POST_GRADUATION').map(normalizeEducationRecord);
        })(),
        otherCertificates: (() => {
            const list = Array.isArray(emp?.otherCertificates) ? emp.otherCertificates : (Array.isArray(emp?.education?.otherCertificates) ? emp.education.otherCertificates : (Array.isArray(emp?.certifications) ? emp.certifications : []));
            if (list.length > 0) return list;
            const eduArr = Array.isArray(emp?.educations) ? emp.educations : (Array.isArray(emp?.educationHistory) ? emp.educationHistory : (Array.isArray(emp?.education) ? emp.education : []));
            return eduArr.filter(e => {
                const type = e.education_type || e.educationType;
                return type && !['SSC', 'INTERMEDIATE', 'GRADUATION', 'POST_GRADUATION'].includes(type);
            }).map(e => ({
                id: e.id || null,
                instituteName: e.institutionName || e.institution_name || e.school || e.college || '',
                certificateNumber: e.hallTicketNo || e.hallTicketNumber || e.hall_ticket_number || '',
                certificatePath: e.certificatePath || e.certificateFilePath || e.certificate_file_path || null
            }));
        })(),
        internships: (Array.isArray(emp?.internships) ? emp.internships : (Array.isArray(emp?.employee?.internships) ? emp.employee.internships : [])).map(normalizeInternshipRecord),
        workExperiences: (Array.isArray(emp?.workExperiences || emp?.workHistory) ? (emp.workExperiences || emp.workHistory) : (Array.isArray(emp?.employee?.workExperiences) ? emp.employee.workExperiences : [])).map(normalizeWorkExperienceRecord),
        
        // Metadata
        identityProofs: identityProofs.map(normalizeProofRecord),
        educationCount: Number(emp?.educationCount ?? (
            (emp?.ssc || emp?.education?.ssc ? 1 : 0) + 
            (emp?.intermediate || emp?.education?.intermediate ? 1 : 0) + 
            (emp?.graduation || emp?.education?.graduation ? 1 : 0) +
            (Array.isArray(emp?.postGraduations) ? emp.postGraduations.length : 0)
        )),
        internshipCount: Number(emp?.internshipCount ?? (Array.isArray(emp?.internships) ? emp.internships.length : 0)),
        workExperienceCount: Number(emp?.workExperienceCount ?? (Array.isArray(emp?.workExperiences || emp?.workHistory) ? (emp.workExperiences || emp.workHistory).length : 0)),
        identityProofCount: Number(emp?.identityProofCount ?? identityProofs.length),
        dept: (emp?.deptCode || (typeof emp?.dept === 'object' ? emp?.dept?.deptCode : emp?.dept)) ?? "",
        role: (emp?.roleCode || (typeof emp?.role === 'object' ? emp?.role?.roleCode : emp?.role)) ?? "",
        entity: (emp?.entityCode || (typeof emp?.entity === 'object' ? emp?.entity?.entityCode : emp?.entity)) ?? "",
    };

    return res;
};

export const normalizeEmployeeList = (data) => {
    let rawList = [];
    if (Array.isArray(data)) {
        rawList = data;
    } else if (data && Array.isArray(data.content)) {
        rawList = data.content;
    } else if (data && Array.isArray(data.data)) {
        rawList = data.data;
    } else {
        console.warn('⚠️ [normalizeEmployeeList] Unexpected data shape:', data);
        return [];
    }

    return rawList
        .filter(item => {
            if (!item || typeof item !== 'object') return false;
            if (item.status === 500 || item.error === 'Internal Server Error') return false;
            return item.id || item.empId || item.fullName || item.name;
        })
        .map(raw => {
            try {
                return normalizeEmployee(raw);
            } catch (err) {
                console.error('⚠️ [normalizeEmployeeList] Skipping broken record:', raw, err);
                return null;
            }
        })
        .filter(Boolean);
};
