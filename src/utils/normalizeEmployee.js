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

// ─── MAIN NORMALIZER ─────────────────────────────────────────────

export const normalizeEmployee = (rawEmp) => {
    if (!rawEmp || typeof rawEmp !== 'object') return null;

    // Step 1: Deep copy to handle potential mutations/circularity
    let emp = safeCopy(rawEmp);

    // Step 2: Auto-Pivot for wrapped responses
    if (!emp.fullName && !emp.name && (emp.employee || emp.data || emp.onboarding)) {
        emp = emp.employee || emp.data || emp.onboarding;
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
        createdAt: emp?.createdAt ? formatDateTime(emp.createdAt) : null,

        // Identity
        panNumber: scavengeValue(emp, 'panNumber', 'panProof.panNumber', 'employee.panNumber', 'identityProof.panNumber', 'personal.panNumber') ||
                  findProof(identityProofs, 'PAN')?.panNumber || "",
        aadharNumber: scavengeValue(emp, 'aadharNumber', 'aadhaarNumber', 'panProof.aadhaarNumber', 'employee.aadhaarNumber', 'identityProof.aadhaarNumber', 'personal.aadharNumber') ||
                     findProof(identityProofs, 'AADHAR')?.aadhaarNumber || "",
        
        // Paths
        photoPath: scavengePath(emp, 'photoPath', 'panProof.photoFilePath', 'personal.photoPath', 'employee.photoPath') || findProof(identityProofs, 'PHOTO')?.filePath || null,
        panPath: scavengePath(emp, 'panPath', 'panProof.panFilePath', 'employee.panPath', 'identityProof.panFilePath') || findProof(identityProofs, 'PAN')?.filePath || null,
        aadharPath: scavengePath(emp, 'aadharPath', 'aadhaarPath', 'panProof.aadhaarFilePath', 'employee.aadharPath', 'identityProof.aadhaarFilePath') || findProof(identityProofs, 'AADHAR')?.filePath || null,
        passbookPath: scavengePath(emp, 'passbookPath', 'bankDetails.documentFilePath', 'employee.bankDetails.documentFilePath', 'bankProof.documentFilePath', 'bankDocumentPath') || null,
        passportPath: scavengePath(emp, 'passportPath', 'panProof.passportFilePath', 'employee.passportPath') || findProof(identityProofs, 'PASSPORT')?.filePath || null,
        voterPath: scavengePath(emp, 'voterPath', 'panProof.voterIdFilePath', 'employee.voterPath', 'voterIdFilePath') || findProof(identityProofs, 'VOTER')?.filePath || null,

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
        ssc: scavengeValue(emp, 'ssc', 'education.ssc') ?? null,
        intermediate: scavengeValue(emp, 'intermediate', 'education.intermediate') ?? null,
        graduation: scavengeValue(emp, 'graduation', 'education.graduation') ?? null,
        postGraduations: Array.isArray(emp?.postGraduations) ? emp.postGraduations : (Array.isArray(emp?.education?.postGraduations) ? emp.education.postGraduations : []),
        otherCertificates: Array.isArray(emp?.otherCertificates) ? emp.otherCertificates : (Array.isArray(emp?.education?.otherCertificates) ? emp.education.otherCertificates : []),
        internships: Array.isArray(emp?.internships) ? emp.internships : (Array.isArray(emp?.employee?.internships) ? emp.employee.internships : []),
        workExperiences: Array.isArray(emp?.workExperiences || emp?.workHistory) ? (emp.workExperiences || emp.workHistory) : (Array.isArray(emp?.employee?.workExperiences) ? emp.employee.workExperiences : []),
        
        // Metadata
        identityProofs: identityProofs,
        educationCount: Number(emp?.educationCount ?? 0),
        internshipCount: Number(emp?.internshipCount ?? 0),
        workExperienceCount: Number(emp?.workExperienceCount ?? 0),
        identityProofCount: Number(emp?.identityProofCount ?? 0),
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
