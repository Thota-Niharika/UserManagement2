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
        // Backend uses certificateFilePath, marksMemoFilePath (not certificatePath / marksMemoPath)
        certificatePath: raw.certificatePath || raw.certificateFilePath || raw.certificate_file_path || null,
        marksMemoPath: raw.marksMemoPath || raw.marksMemoFilePath || raw.marks_memo_file_path || null
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
 *
 * The backend stores all identity docs in ONE record per employee with
 * separate typed path fields (photoFilePath, panFilePath, aadhaarFilePath, etc.).
 * We expand that combined record into individual typed proof objects so the
 * rest of the UI can work with them uniformly.
 */
export const normalizeProofRecord = (raw) => {
    if (!raw) return null;
    return {
        ...raw,
        proofType: raw.proof_type || raw.proofType || raw.type || "",
        idNumber: raw.id_number || raw.idNumber || raw.panNumber || raw.aadhaarNumber || "",
        // Support both legacy filePath AND the new per-type path fields
        filePath: scavengePath(raw, 'file_path', 'filePath') ||
                  scavengePath(raw, 'photoFilePath', 'panFilePath', 'aadhaarFilePath') || null
    };
};

/**
 * Expands the backend's single combined identity proof record into
 * individual typed proof objects understood by getProof() in the UI.
 * e.g. { panFilePath, aadhaarFilePath, photoFilePath } →
 *      [{ proofType:'PAN', filePath:... }, { proofType:'AADHAR', filePath:... }, ...]
 */
const expandIdentityProofs = (proofs) => {
    if (!Array.isArray(proofs) || proofs.length === 0) return [];

    const combined = proofs[0]; // Backend always returns exactly one object

    // If it already has a proofType field it's the old per-type format — leave as-is
    if (combined.proofType || combined.type || combined.proof_type) {
        return proofs.map(normalizeProofRecord);
    }

    // New format: single object with per-type path fields
    const expanded = [];
    const tryAdd = (proofType, filePath, idNumber) => {
        const p = scavengePath(combined, filePath);
        if (p) expanded.push({ ...combined, proofType, filePath: p, idNumber: idNumber || '' });
    };

    tryAdd('PHOTO',    'photoFilePath',    '');
    tryAdd('PAN',      'panFilePath',       combined.panNumber || '');
    tryAdd('AADHAR',   'aadhaarFilePath',   combined.aadhaarNumber || '');
    tryAdd('PASSPORT', 'passportFilePath',  '');
    tryAdd('VOTER',    'voterIdFilePath',   '');

    return expanded.length > 0 ? expanded : proofs.map(normalizeProofRecord);
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

    // Step 3: Identity Discovery
    // Raw proofs come from the merged onboardingForm — grab BEFORE safeCopy strips onboardingForm
    const rawOnboardingForm = rawEmp?.onboardingForm || null;
    const rawIdentityProofs = Array.isArray(rawOnboardingForm?.identityProofs)
        ? rawOnboardingForm.identityProofs
        : (Array.isArray(emp?.identityProofs) ? emp.identityProofs
          : (Array.isArray(emp?.employee?.identityProofs) ? emp.employee.identityProofs : []));

    // Raw bank details (inside onboardingForm, stripped by safeCopy)
    const rawBank = rawOnboardingForm?.bankDetails || emp?.bankDetails || emp?.employee?.bankDetails || null;

    // Expand the combined backend record into individual typed proof objects
    const identityProofs = expandIdentityProofs(rawIdentityProofs);

    // Shortcut: first identity record (the combined one) for direct field access
    const idProof0 = (Array.isArray(rawIdentityProofs) && rawIdentityProofs[0]) ? rawIdentityProofs[0] : null;

    // Step 4: Map fields via Scavenging
    const res = {
        // Basic Info
        id: (emp?.id || emp?.employeeId) ?? null,
        employeeId: (emp?.id || emp?.employeeId) ?? null,
        // Backend generates the code in 'empId' field (e.g. "FIS0226IT00001")
        empId: scavengeValue(emp, 'empId', 'employee.empId', 'onboarding.empId') || "",
        // empCode aliases empId so all UI components (table, modals, profile) show it correctly
        empCode: scavengeValue(emp, 'empCode', 'employeeCode', 'employee.empCode', 'employee.employeeCode')
               || scavengeValue(emp, 'empId', 'employee.empId') || "",
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

        // Identity Numbers
        panNumber: scavengeValue(idProof0, 'panNumber') ||
                  scavengeValue(emp, 'panNumber', 'panProof.panNumber', 'employee.panNumber', 'identityProof.panNumber', 'personal.panNumber') ||
                  findProof(identityProofs, 'PAN')?.idNumber || "",
        aadharNumber: scavengeValue(idProof0, 'aadhaarNumber', 'aadharNumber') ||
                     scavengeValue(emp, 'aadharNumber', 'aadhaarNumber', 'aadharProof.aadhaarNumber', 'panProof.aadhaarNumber', 'employee.aadhaarNumber', 'identityProof.aadhaarNumber', 'personal.aadharNumber') ||
                     findProof(identityProofs, 'AADHAR')?.idNumber || "",

        // File Paths — first try the direct backend fields in idProof0, then fall back to scavenging
        photoPath:    scavengePath(idProof0, 'photoFilePath')    || scavengePath(emp, 'photoPath', 'photoProof.filePath', 'personal.photoPath', 'employee.photoPath') || scavengePath(findProof(identityProofs, 'PHOTO'),    'filePath') || null,
        panPath:      scavengePath(idProof0, 'panFilePath')      || scavengePath(emp, 'panPath', 'panProof.filePath', 'panProof.panFilePath', 'employee.panPath') || scavengePath(findProof(identityProofs, 'PAN'),     'filePath') || null,
        aadharPath:   scavengePath(idProof0, 'aadhaarFilePath')  || scavengePath(emp, 'aadharPath', 'aadhaarPath', 'aadharProof.filePath', 'employee.aadharPath') || scavengePath(findProof(identityProofs, 'AADHAR'),  'filePath') || null,
        passbookPath: scavengePath(rawBank, 'documentFilePath', 'filePath') || scavengePath(emp, 'passbookPath', 'bankDetails.documentFilePath', 'bankDetails.filePath', 'employee.bankDetails.documentFilePath', 'bankProof.documentFilePath', 'bankDocumentPath') || null,
        passportPath: scavengePath(idProof0, 'passportFilePath') || scavengePath(emp, 'passportPath', 'passportProof.filePath', 'employee.passportPath') || scavengePath(findProof(identityProofs, 'PASSPORT'), 'filePath') || null,
        voterPath:    scavengePath(idProof0, 'voterIdFilePath')  || scavengePath(emp, 'voterPath', 'voterProof.filePath', 'employee.voterPath', 'voterIdFilePath') || scavengePath(findProof(identityProofs, 'VOTER'),    'filePath') || null,

        // Personal — also check rawOnboardingForm since safeCopy strips it
        bloodGroup: scavengeValue(rawOnboardingForm, 'bloodGroup') || scavengeValue(emp, 'bloodGroup', 'personal.bloodGroup', 'employee.bloodGroup', 'personalDetails.bloodGroup') || "",
        fathersName: scavengeValue(rawOnboardingForm, 'fatherName', 'fathersName') || scavengeValue(emp, 'fathersName', 'fatherName', 'personal.fathersName', 'employee.fathersName') || "",
        fathersPhone: scavengeValue(rawOnboardingForm, 'fatherPhone', 'fathersPhone') || scavengeValue(emp, 'fathersPhone', 'fatherPhone', 'personal.fathersPhone', 'employee.fathersPhone') || "",
        mothersName: scavengeValue(rawOnboardingForm, 'motherName', 'mothersName') || scavengeValue(emp, 'mothersName', 'motherName', 'personal.mothersName', 'employee.mothersName') || "",
        mothersPhone: scavengeValue(rawOnboardingForm, 'motherPhone', 'mothersPhone') || scavengeValue(emp, 'mothersPhone', 'motherPhone', 'personal.mothersPhone', 'employee.mothersPhone') || "",
        emergencyContactName: scavengeValue(rawOnboardingForm, 'emergencyContactName') || scavengeValue(emp, 'emergencyContactName', 'emergencyName', 'personal.emergencyContactName', 'employee.emergencyContactName') || "",
        emergencyRelationship: scavengeValue(rawOnboardingForm, 'emergencyRelationship') || scavengeValue(emp, 'emergencyRelationship', 'emergencyRel', 'personal.emergencyRelationship', 'employee.emergencyRelationship') || "",
        emergencyNumber: scavengeValue(rawOnboardingForm, 'emergencyContactNumber', 'emergencyNumber') || scavengeValue(emp, 'emergencyNumber', 'emergencyPhone', 'personal.emergencyNumber', 'employee.emergencyNumber') || "",

        // Bank — use rawBank extracted directly from rawOnboardingForm.bankDetails
        bankName:      scavengeValue(rawBank, 'bankName')      || scavengeValue(emp, 'bankName', 'bankDetails.bankName', 'employee.bankDetails.bankName')      || "",
        branchName:    scavengeValue(rawBank, 'branchName')    || scavengeValue(emp, 'branchName', 'bankDetails.branchName', 'employee.bankDetails.branchName')  || "",
        ifscCode:      scavengeValue(rawBank, 'ifscCode')      || scavengeValue(emp, 'ifscCode', 'bankDetails.ifscCode', 'employee.bankDetails.ifscCode')        || "",
        accountNumber: scavengeValue(rawBank, 'accountNumber') || scavengeValue(emp, 'accountNumber', 'bankDetails.accountNumber', 'employee.bankDetails.accountNumber') || "",
        upiId:         scavengeValue(rawBank, 'upiId')         || scavengeValue(emp, 'upiId', 'bankDetails.upiId', 'employee.bankDetails.upiId')                 || "",
        bankProof: rawBank || emp?.bankProof || emp?.employee?.bankDetails || null,

        // Address — also check rawOnboardingForm
        presentAddress:   scavengeValue(rawOnboardingForm, 'presentAddress')   || scavengeValue(emp, 'presentAddress', 'presAddress', 'personal.presentAddress', 'employee.presentAddress')     || "",
        permanentAddress: scavengeValue(rawOnboardingForm, 'permanentAddress') || scavengeValue(emp, 'permanentAddress', 'permAddress', 'personal.permanentAddress', 'employee.permanentAddress') || "",

        // Education & Lists — always prefer rawOnboardingForm.educations (safeCopy strips it)
        ssc: normalizeEducationRecord(
            scavengeValue(emp, 'ssc', 'education.ssc') ||
            findInArray(rawOnboardingForm?.educations || emp?.educations || emp?.educationHistory, 'educationType', 'SSC') ||
            findInArray(rawOnboardingForm?.educations || emp?.educations || emp?.educationHistory, 'education_type', 'SSC')
        ),
        intermediate: normalizeEducationRecord(
            scavengeValue(emp, 'intermediate', 'education.intermediate') ||
            findInArray(rawOnboardingForm?.educations || emp?.educations || emp?.educationHistory, 'educationType', 'INTERMEDIATE') ||
            findInArray(rawOnboardingForm?.educations || emp?.educations || emp?.educationHistory, 'education_type', 'INTERMEDIATE')
        ),
        graduation: normalizeEducationRecord(
            scavengeValue(emp, 'graduation', 'education.graduation') ||
            findInArray(rawOnboardingForm?.educations || emp?.educations || emp?.educationHistory, 'educationType', 'GRADUATION') ||
            findInArray(rawOnboardingForm?.educations || emp?.educations || emp?.educationHistory, 'education_type', 'GRADUATION') ||
            (Array.isArray(emp?.graduations) ? emp.graduations[0] : null)
        ),
        postGraduations: (() => {
            const list = Array.isArray(emp?.postGraduations) ? emp.postGraduations : (Array.isArray(emp?.education?.postGraduations) ? emp.education.postGraduations : []);
            if (list.length > 0) return list.map(normalizeEducationRecord);
            const eduArr = rawOnboardingForm?.educations || emp?.educations || emp?.educationHistory || emp?.education || [];
            if (!Array.isArray(eduArr)) return [];
            return eduArr.filter(e => (e.education_type || e.educationType) === 'POST_GRADUATION').map(normalizeEducationRecord);
        })(),
        otherCertificates: (() => {
            // Backend uses 'certifications' as the array key
            const certSrc = Array.isArray(rawOnboardingForm?.certifications) ? rawOnboardingForm.certifications : null;
            const list = certSrc || (Array.isArray(emp?.otherCertificates) ? emp.otherCertificates : (Array.isArray(emp?.education?.otherCertificates) ? emp.education.otherCertificates : (Array.isArray(emp?.certifications) ? emp.certifications : [])));
            if (list.length > 0) return list.map(c => ({
                ...c,
                instituteName: c.instituteName || c.institution_name || '',
                certificateNumber: c.certificateNumber || '',
                certificatePath: c.certificatePath || c.certificateFilePath || c.certificate_file_path || null
            }));
            const eduArr = rawOnboardingForm?.educations || emp?.educations || emp?.educationHistory || emp?.education || [];
            if (!Array.isArray(eduArr)) return [];
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
        // Backend uses 'experiences' for work experience records
        internships: (() => {
            const src = Array.isArray(rawOnboardingForm?.internships) ? rawOnboardingForm.internships
                      : (Array.isArray(emp?.internships) ? emp.internships
                        : (Array.isArray(emp?.employee?.internships) ? emp.employee.internships : []));
            return src.map(normalizeInternshipRecord);
        })(),
        workExperiences: (() => {
            const src = Array.isArray(rawOnboardingForm?.experiences) ? rawOnboardingForm.experiences
                      : (Array.isArray(emp?.workExperiences) ? emp.workExperiences
                        : (Array.isArray(emp?.workHistory) ? emp.workHistory
                          : (Array.isArray(emp?.experiences) ? emp.experiences
                            : (Array.isArray(emp?.employee?.workExperiences) ? emp.employee.workExperiences : []))));
            return src.map(normalizeWorkExperienceRecord);
        })(),

        // Metadata — compute counts AFTER resolving the arrays above
        identityProofs: identityProofs.map(normalizeProofRecord),
        get educationCount() {
            return (this.ssc ? 1 : 0) + (this.intermediate ? 1 : 0) + (this.graduation ? 1 : 0) +
                   (this.postGraduations?.length || 0);
        },
        get internshipCount() { return this.internships?.length || 0; },
        get workExperienceCount() { return this.workExperiences?.length || 0; },
        identityProofCount: identityProofs.length,
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
