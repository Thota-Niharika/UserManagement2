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
 *
 * LOCKED CONTRACT (what every component receives):
 * {
 *   id:               number,
 *   empCode:          string,
 *   name:             string,
 *   email:            string,
 *   phone:            string,
 *   deptName:         string,
 *   roleName:         string,
 *   entityName:       string,
 *   status:           string,       // ACTIVE | ONBOARDING | INACTIVE
 *   onboardingDate:   string,       // YYYY-MM-DD
 *   dateOfInterview:  string,       // YYYY-MM-DD
 *   dateOfBirth:      string,       // YYYY-MM-DD
 *   photoPath:        string|null,
 *   // --- Detail-only fields (populated by getEmployeeDetail) ---
 *   empId:            string|null,
 *   bloodGroup:       string,
 *   fathersName:      string,
 *   fathersPhone:     string,
 *   mothersName:      string,
 *   mothersPhone:     string,
 *   emergencyContactName: string,
 *   emergencyRelationship: string,
 *   emergencyNumber:  string,
 *   bankName:         string,
 *   branchName:       string,
 *   ifscCode:         string,
 *   accountNumber:    string,
 *   upiId:            string,
 *   presentAddress:   string,
 *   permanentAddress: string,
 *   panNumber:        string,
 *   panPath:          string|null,
 *   aadharNumber:     string,
 *   aadharPath:       string|null,
 *   passbookPath:     string|null,
 *   passportPath:     string|null,
 *   voterPath:        string|null,
 *   // Nested detail arrays (kept as-is from backend)
 *   identityProofs:   array,
 *   ssc:              object|null,
 *   intermediate:     object|null,
 *   graduation:       object|null,
 *   postGraduations:  array,
 *   otherCertificates: array,
 *   internships:      array,
 *   workExperiences:  array,
 *   // Counts
 *   educationCount:   number,
 *   internshipCount:  number,
 *   workExperienceCount: number,
 *   identityProofCount: number,
 *   createdAt:        object|null,
 * }
 */

// ─── HELPERS ─────────────────────────────────────────────────────

/**
 * Minimal cycle detection to prevent infinite recursion
 * if backend returns circular references.
 */
function safeCopy(value, seen = new WeakSet()) {
    if (value === null || typeof value !== 'object') return value;
    if (seen.has(value)) return null;
    seen.add(value);

    if (Array.isArray(value)) {
        return value.map(v => safeCopy(v, seen));
    }

    const result = {};
    for (const key in value) {
        // Hard-cut fields known to cause circular references
        if (['employeeForm', 'onboardingForm'].includes(key)) continue;
        result[key] = safeCopy(value[key], seen);
    }
    return result;
}

/**
 * Format any backend date to YYYY-MM-DD string.
 * Handles: Java [year, month, day] arrays, ISO strings, null.
 */
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

/**
 * Format datetime to { date, time } object.
 */
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

/**
 * Extract a display name from a value that could be:
 * - a plain string: "Engineering"
 * - an object with common name fields: { deptName: "Engineering", deptCode: "D01" }
 * - null/undefined
 */
const extractName = (val, ...nameKeys) => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
        for (const key of nameKeys) {
            if (val[key] && typeof val[key] === 'string') return val[key];
        }
        // Last resort: try 'name'
        if (val.name && typeof val.name === 'string') return val.name;
    }
    return '';
};

/**
 * Scavenge a primitive value from an object given multiple potential keys or dot-notated paths.
 * Returns the first non-null/non-undefined value found.
 */
export const scavengeValue = (obj, ...paths) => {
    if (!obj || typeof obj !== 'object') return null;

    for (const path of paths) {
        // Handle dot-notation: "panProof.panNumber"
        if (typeof path === 'string' && path.includes('.')) {
            const parts = path.split('.');
            let current = obj;
            for (const part of parts) {
                current = current ? current[part] : undefined;
            }
            if (current !== undefined && current !== null) return current;
            continue;
        }

        // Handle direct key: "panNumber"
        if (obj[path] !== undefined && obj[path] !== null) {
            return obj[path];
        }
    }
    return null;
};

/**
 * Scavenge a file path/URL from an object. 
 * Returns the first valid path found, specifically filtering out "NOT_UPLOADED".
 */
export const scavengePath = (obj, ...paths) => {
    const val = scavengeValue(obj, ...paths);
    if (!val || typeof val !== 'string') return null;
    const trimmed = val.trim();
    if (trimmed === 'NOT_UPLOADED' || trimmed === 'null' || trimmed === '' || trimmed === 'undefined') return null;
    return trimmed;
};

/**
 * Find a specific proof in an identityProofs array by type.
 */
export const findProof = (proofs, targetType) => {
    if (!Array.isArray(proofs)) return null;
    const target = targetType.toUpperCase();
    return proofs.find(p => {
        const type = ((p.type || p.proofType) || '').toUpperCase();
        return type === target;
    });
};

// ─── MAIN NORMALIZER ─────────────────────────────────────────────

/**
 * Normalizes ANY raw backend employee object into the locked flat contract.
 * This is the ONLY function components should use.
 *
 * @param {object} rawEmp - Raw employee from backend (any shape)
 * @returns {object} - Flat, predictable employee object
 */
export const normalizeEmployee = (rawEmp) => {
    if (!rawEmp || typeof rawEmp !== 'object') return null;

    // Step 1: Break circular references
    const emp = safeCopy(rawEmp);

    // Step 2: Extract flat values with strict fallbacks (The Contract)
    // Basic Info
    const id = (emp?.id || emp?.employeeId) ?? null;
    const empCode = (emp?.empCode || emp?.employeeCode) ?? "";
    const empId = emp?.empId ?? "";
    const name = (emp?.fullName || emp?.name) ?? scavengeValue(emp, 'personal.fullName', 'personalDetails.fullName') ?? "Unknown";
    const email = scavengeValue(emp, 'email', 'personal.email', 'personalDetails.email') ?? "";
    const phone = scavengeValue(emp, 'phone', 'phoneNumber', 'personal.phoneNumber', 'personalDetails.phoneNumber') ?? "";

    // Department/Role/Entity extraction
    const deptName = extractName(emp?.deptName, 'deptName') ||
        extractName(emp?.dept, 'deptName', 'departmentName') ||
        extractName(emp?.department, 'deptName', 'departmentName') ||
        "None";

    const roleName = extractName(emp?.roleName, 'roleName') ||
        extractName(emp?.role, 'roleName') ||
        "None";

    const entityName = extractName(emp?.entityName, 'entityName') ||
        extractName(emp?.entity, 'entityName') ||
        "None";

    // Status logic
    const status = typeof emp?.status === 'string' ? emp.status : "UNKNOWN";
    const onboardingStatus = emp?.onboarding?.status || emp?.onboardingStatus || "NOT_STARTED";

    // Dates — always YYYY-MM-DD strings
    const onboardingDate = formatDate(emp?.dateOfOnboarding || emp?.onboardingDate);
    const dateOfInterview = formatDate(emp?.dateOfInterview);
    const dateOfBirth = formatDate(scavengeValue(emp, 'dateOfBirth', 'dob', 'personal.dateOfBirth', 'personalDetails.dateOfBirth'));

    // Identity Discovery (Search Root, panProof, or identityProofs array)
    const identityProofs = Array.isArray(emp?.identityProofs) ? emp.identityProofs : [];

    const panNumber = scavengeValue(emp, 'panNumber', 'panProof.panNumber', 'identityProof.panNumber') ||
        findProof(identityProofs, 'PAN')?.panNumber || "";

    const aadharNumber = scavengeValue(emp, 'aadharNumber', 'aadhaarNumber', 'panProof.aadhaarNumber', 'identityProof.aadhaarNumber') ||
        findProof(identityProofs, 'AADHAR')?.aadhaarNumber || "";

    // File Discovery (Scavenge everything deeply)
    const photoPath = scavengePath(emp, 'photoPath', 'panProof.photoFilePath', 'personal.photoPath') || findProof(identityProofs, 'PHOTO')?.filePath || null;
    const panPath = scavengePath(emp, 'panPath', 'panProof.panFilePath', 'identityProof.panFilePath') || findProof(identityProofs, 'PAN')?.filePath || null;
    const aadharPath = scavengePath(emp, 'aadharPath', 'aadhaarPath', 'panProof.aadhaarFilePath', 'identityProof.aadhaarFilePath') || findProof(identityProofs, 'AADHAR')?.filePath || null;
    const passbookPath = scavengePath(emp, 'passbookPath', 'bankDetails.documentFilePath', 'bankProof.documentFilePath') || null;
    const passportPath = scavengePath(emp, 'passportPath', 'panProof.passportFilePath') || findProof(identityProofs, 'PASSPORT')?.filePath || null;
    const voterPath = scavengePath(emp, 'voterPath', 'panProof.voterIdFilePath') || findProof(identityProofs, 'VOTER')?.filePath || null;

    // Personal & Family
    const bloodGroup = scavengeValue(emp, 'bloodGroup', 'personal.bloodGroup', 'personalDetails.bloodGroup') ?? "";
    const fathersName = scavengeValue(emp, 'fathersName', 'personal.fathersName', 'personalDetails.fathersName') ?? "";
    const fathersPhone = scavengeValue(emp, 'fathersPhone', 'personal.fathersPhone', 'personalDetails.fathersPhone') ?? "";
    const mothersName = scavengeValue(emp, 'mothersName', 'personal.mothersName', 'personalDetails.mothersName') ?? "";
    const mothersPhone = scavengeValue(emp, 'mothersPhone', 'personal.mothersPhone', 'personalDetails.mothersPhone') ?? "";
    const emergencyContactName = scavengeValue(emp, 'emergencyContactName', 'emergencyName', 'personal.emergencyContactName') ?? "";
    const emergencyRelationship = scavengeValue(emp, 'emergencyRelationship', 'emergencyRel', 'personal.emergencyRelationship') ?? "";
    const emergencyNumber = scavengeValue(emp, 'emergencyNumber', 'emergencyPhone', 'personal.emergencyNumber') ?? "";

    // Bank Details
    const bankName = scavengeValue(emp, 'bankName', 'bankDetails.bankName') ?? "";
    const branchName = scavengeValue(emp, 'branchName', 'bankDetails.branchName') ?? "";
    const ifscCode = scavengeValue(emp, 'ifscCode', 'bankDetails.ifscCode') ?? "";
    const accountNumber = scavengeValue(emp, 'accountNumber', 'bankDetails.accountNumber') ?? "";
    const upiId = scavengeValue(emp, 'upiId', 'bankDetails.upiId') ?? "";

    // Address
    const presentAddress = scavengeValue(emp, 'presentAddress', 'presAddress', 'personal.presentAddress') ?? "";
    const permanentAddress = scavengeValue(emp, 'permanentAddress', 'permAddress', 'personal.permanentAddress') ?? "";

    // Nested detail arrays (keep as-is but ensure they exist)
    const ssc = emp?.ssc ?? null;
    const intermediate = emp?.intermediate ?? null;
    const graduation = emp?.graduation ?? null;
    const postGraduations = Array.isArray(emp?.postGraduations) ? emp.postGraduations : [];
    const otherCertificates = Array.isArray(emp?.otherCertificates) ? emp.otherCertificates : [];
    const internships = Array.isArray(emp?.internships) ? emp.internships : [];
    const workExperiences = Array.isArray(emp?.workExperiences || emp?.workHistory) ? (emp.workExperiences || emp.workHistory) : [];
    const bankProof = emp?.bankProof ?? emp?.bankDetails ?? null;

    // CreatedAt (keep as formatted object for display)
    const createdAt = emp?.createdAt ? formatDateTime(emp.createdAt) : null;

    // Counts
    const educationCount = Number(emp?.educationCount ?? 0);
    const internshipCount = Number(emp?.internshipCount ?? 0);
    const workExperienceCount = Number(emp?.workExperienceCount ?? 0);
    const identityProofCount = Number(emp?.identityProofCount ?? 0);

    // Raw codes for form editing
    const deptCode = (emp?.deptCode || (typeof emp?.dept === 'object' ? emp?.dept?.deptCode : emp?.dept)) ?? "";
    const roleCode = (emp?.roleCode || (typeof emp?.role === 'object' ? emp?.role?.roleCode : emp?.role)) ?? "";
    const entityCode = (emp?.entityCode || (typeof emp?.entity === 'object' ? emp?.entity?.entityCode : emp?.entity)) ?? "";

    return {
        id,
        employeeId: id,
        empId,
        empCode,
        name,
        email,
        phone,
        deptName,
        roleName,
        entityName,
        status,
        onboardingStatus,
        onboardingDate,
        dateOfOnboarding: onboardingDate,
        dateOfInterview,
        dateOfBirth,
        createdAt,
        photoPath,
        panPath,
        aadharPath,
        passbookPath,
        passportPath,
        voterPath,
        bloodGroup,
        fathersName,
        fathersPhone,
        mothersName,
        mothersPhone,
        emergencyContactName,
        emergencyRelationship,
        emergencyNumber,
        bankName,
        branchName,
        ifscCode,
        accountNumber,
        upiId,
        bankProof,
        presentAddress,
        permanentAddress,
        panNumber,
        aadharNumber,
        identityProofs,
        ssc,
        intermediate,
        graduation,
        postGraduations,
        otherCertificates,
        internships,
        workExperiences,
        educationCount,
        internshipCount,
        workExperienceCount,
        identityProofCount,
        dept: deptCode,
        role: roleCode,
        entity: entityCode,
    };
};

/**
 * Normalize an array of employees. Filters out garbage records.
 * @param {any} data - Raw API response (array, paginated object, or junk)
 * @returns {Array} - Clean array of normalized employees
 */
export const normalizeEmployeeList = (data) => {
    // Extract array from various response shapes
    let rawList = [];
    if (Array.isArray(data)) {
        rawList = data;
    } else if (data && Array.isArray(data.content)) {
        rawList = data.content; // Spring Boot Page response
    } else if (data && Array.isArray(data.data)) {
        rawList = data.data;
    } else {
        console.warn('⚠️ [normalizeEmployeeList] Unexpected data shape:', data);
        return [];
    }

    return rawList
        .filter(item => {
            if (!item || typeof item !== 'object') return false;
            // Reject backend error objects
            if (item.status === 500 || item.error === 'Internal Server Error') return false;
            // Must look like an employee
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
