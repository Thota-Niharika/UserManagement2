
import axios from "axios";
import { API_BASE_URL } from '../config/api';
import { normalizeEmployee, normalizeEmployeeList } from '../utils/normalizeEmployee';
import { parseIfString } from '../utils/apiUtils';

// --- CLEAN API EXPORTS ---
export const submitOnboarding = async (dtoOrFormData, files = [], token = null) => {
  let payload;
  let endpoint;

  if (dtoOrFormData instanceof FormData) {
    // 🚀 NEW: Flat FormData built by component
    payload = dtoOrFormData;
    endpoint = token ? `/onboarding/submit?token=${encodeURIComponent(token)}` : '/onboarding/submit';
  } else {
    // 🏛️ LEGACY: Grouped DTO + Files
    const formData = new FormData();
    formData.append("data", JSON.stringify(dtoOrFormData));
    const fileList = Array.isArray(files) ? files : Object.values(files || {});
    fileList.forEach((file) => { if (file) formData.append("files", file); });
    payload = formData;
    endpoint = token ? `/onboarding/submit?token=${encodeURIComponent(token)}` : "/onboarding/submit";
  }

  return safePost(endpoint, payload);
};

// ─── HARDENED API CLIENT ──────────────────────────────────────────

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 5 minutes — allow large file uploads
});

/**
 * Core GET handler with automatic type-safety and error suppression.
 * NEVER CRASHES THE UI.
 */
export const safeGet = async (url) => {
  try {
    const res = await api.get(url);
    const data = parseIfString(res.data);

    console.log("✅ RAW API RESPONSE:", data);

    if (!data) return null;

    // 🚀 Metadata-Safe Unwrapping: If it's an object with a 'data'/'content' key, merge them
    // but only for objects, not arrays.
    if (data.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
        return { ...data, ...data.data };
    }
    if (data.content && typeof data.content === 'object' && !Array.isArray(data.content)) {
        return { ...data, ...data.content };
    }

    if (data.data) return data.data;
    if (data.content) return data.content;
    if (data.onboarding) return data.onboarding;

    return data;

  } catch (err) {
    console.error("❌ API ERROR:", err.response?.data || err.message);
    throw err; // 🔥 CRITICAL FIX (remove return [])
  }
};

/**
 * Helper to extract a readable error message from Axios errors.
 */
const getErrorMessage = (err) => {
  const backendData = err.response?.data;
  if (backendData && typeof backendData === 'object') {
    return backendData.message || backendData.error || JSON.stringify(backendData);
  }
  return err.message || "Unknown API Error";
};

/**
 * Core POST handler.
 */
export const safePost = async (url, payload) => {
  try {
    // 🚨 CRITICAL: Do NOT set Content-Type manually for FormData.
    // Axios + browser must generate the boundary automatically.
    // Setting it manually strips the boundary → ERR_CONNECTION_ABORTED.
    const isFormData = payload instanceof FormData;
    const res = await api.post(url, payload, {
      headers: {
        'Accept': 'application/json',
        ...(isFormData ? {} : { 'Content-Type': 'application/json' })
      }
    });
    const parsed = parseIfString(res.data);
    return parsed?.data ?? parsed;
  } catch (err) {
    const msg = getErrorMessage(err);
    console.error(`❌ [FULL BACKEND RESPONSE]:`, JSON.stringify(err.response?.data, null, 2));
    console.error(`❌ [STATUS]:`, err.response?.status);
    console.error(`❌ [API POST FAILED] ${url}:`, msg);
    throw new Error(msg);
  }
};

/**
 * Core PUT handler.
 */
export const safePut = async (url, payload) => {
  try {
    const res = await api.put(url, payload);
    const parsed = parseIfString(res.data);
    return parsed?.data ?? parsed;
  } catch (err) {
    const msg = getErrorMessage(err);
    console.error(`❌ [API PUT FAILED] ${url}:`, msg);
    throw new Error(msg);
  }
};

/**
 * Core DELETE handler.
 */
export const safeDelete = async (url) => {
  try {
    await api.delete(url);
    return true;
  } catch (err) {
    const msg = getErrorMessage(err);
    console.error(`❌ [API DELETE FAILED] ${url}:`, msg);
    throw new Error(msg);
  }
};

/**
 * Core PATCH handler.
 */
export const safePatch = async (url, payload) => {
  try {
    const res = await api.patch(url, payload);
    const parsed = parseIfString(res.data);
    return parsed?.data ?? parsed;
  } catch (err) {
    const msg = getErrorMessage(err);
    console.error(`❌ [API PATCH FAILED] ${url}:`, msg);
    throw new Error(msg);
  }
};

// ─── SERVICE METHODS (Backward Compatibility) ─────────────────────

const ApiService = {
  // --- DEPARTMENTS ---
  getDepartments: () => safeGet('/departments'),
  createDepartment: (data) => safePost('/departments', {
    deptCode: data.deptCode || data.deptId,
    deptName: data.deptName
  }),
  updateDepartment: (id, data) => safePut(`/departments/${id}`, {
    deptCode: data.deptCode || data.deptId,
    deptName: data.deptName
  }),
  deleteDepartment: (id) => safeDelete(`/departments/${id}`),

  // --- ROLES ---
  getRoles: () => safeGet('/roles'),
  createRole: (data) => safePost('/roles', {
    roleCode: data.roleCode,
    roleName: data.roleName
  }),
  updateRole: (id, data) => safePut(`/roles/${id}`, {
    roleCode: data.roleCode,
    roleName: data.roleName
  }),
  deleteRole: (id) => safeDelete(`/roles/${id}`),

  // --- ENTITIES ---
  getEntities: () => safeGet('/entities'),
  createEntity: (data) => safePost('/entities', {
    entityCode: data.entityCode,
    entityName: data.entityName
  }),
  updateEntity: (id, data) => safePut(`/entities/${id}`, {
    entityCode: data.entityCode,
    entityName: data.entityName
  }),
  deleteEntity: (id) => safeDelete(`/entities/${id}`),

  // --- EMPLOYEES (Normalized) ---
  getEmployees: async (page = 0, size = 10) => {
    const raw = await safeGet(`/employees?page=${page}&size=${size}`);
    return normalizeEmployeeList(raw);
  },
  getEmployeeDetail: async (id) => {
    try {
      // 🚀 COMPOSITE FETCH: Get core record AND onboarding details
      // Promise.allSettled ensures if onboarding is missing (404), the profile still shows basic info.
      const [empRes, onboardingRes] = await Promise.allSettled([
        api.get(`/employees/${id}`),
        api.get(`/onboarding/${id}`)
      ]);

      const rawEmp = empRes.status === 'fulfilled' ? empRes.value.data : null;
      const rawOnboarding = onboardingRes.status === 'fulfilled' ? onboardingRes.value.data : null;

      if (!rawEmp) throw new Error("Employee record not found");

      // Extract the payload (handles wrapped data: { data: {...} })
      // Preserve root fields (like createdAt) from rawEmp while extracting employee data
      const employee = (rawEmp.data && typeof rawEmp.data === 'object') ? { ...rawEmp, ...rawEmp.data } : (rawEmp.data || rawEmp);
      const onboarding = (rawOnboarding?.data && typeof rawOnboarding.data === 'object') ? { ...rawOnboarding, ...rawOnboarding.data } : (rawOnboarding?.data || rawOnboarding);

      // 💉 MERGE: Inject onboarding data so normalizer can find it
      const composite = {
        ...employee,
        onboardingForm: onboarding || employee.onboardingForm || null,
        // Fallback for direct field access
        ...(onboarding || {})
      };

      console.log("🧩 [COMPOSITE PROFILE] Merged Data:", composite);
      return normalizeEmployee(composite);
    } catch (err) {
      console.error("❌ Failed to fetch complete profile:", err);
      throw err;
    }
  },
  createEmployee: async (formData) => {
    // 🛡️ SANITIZATION: Empty strings for dates cause 500s in Spring Boot
    const payload = {
      fullName: formData.name,
      dept: formData.department,
      role: formData.role,
      entity: formData.entity,
      dateOfOnboarding: formData.dateOfOnboarding || null,
      dateOfInterview: formData.dateOfInterview || null,
      dateOfBirth: formData.dateOfBirth || null,
      email: formData.email,
      phone: formData.phone,
      status: formData.status || 'ONBOARDING'
    };
    console.log('📤 [createEmployee] Sending payload:', JSON.stringify(payload, null, 2));
    const raw = await safePost('/employees', payload);
    return normalizeEmployee(raw);
  },
  updateEmployee: async (id, formData) => {
    // 🛡️ SANITIZATION: Empty strings for dates cause 500s in Spring Boot
    const payload = {
      fullName: formData.name,
      dept: formData.department,
      entity: formData.entity,
      role: formData.role,
      dateOfOnboarding: formData.dateOfOnboarding || null,
      dateOfInterview: formData.dateOfInterview || null,
      dateOfBirth: formData.dateOfBirth || null,
      email: formData.email,
      phone: formData.phone,
      status: formData.status || 'Active'
    };
    const raw = await safePut(`/employees/${id}`, payload);
    return normalizeEmployee(raw);
  },
  deleteEmployee: (id) => safeDelete(`/employees/${id}`),
  activateEmployee: (id) => safePatch(`/employees/${id}/activate`, {}),
  deactivateEmployee: (id) => safePatch(`/employees/${id}/deactivate`, {}),

  // --- ONBOARDING (FINAL CLEAN VERSION) ---

  // ✅ ONLY ONE FUNCTION — SINGLE SOURCE OF TRUTH
  // --- ONBOARDING ---

  submitOnboarding: (dto, files, token) => {
    return submitOnboarding(dto, files, token);
  },

  // ✅ FIXED: Now uses path variable (matches what backend expects)
  getOnboardingByToken: async (token) => {
    if (!token) {
      console.warn("⚠️ getOnboardingByToken called without token");
      return null;
    }

    const encodedToken = encodeURIComponent(token);

    try {
      // Primary call - using path parameter (this should fix the 500 error)
      return await safeGet(`/onboarding/get-onboarding-by-token/${encodedToken}`);
    } catch (err) {
      console.warn("⚠️ Path parameter failed:", err.message || err);

      // Optional fallback (if backend also supports query param)
      try {
        return await safeGet(`/onboarding/get-onboarding-by-token?token=${encodedToken}`);
      } catch (fallbackErr) {
        console.warn("⚠️ Query fallback also failed, trying details endpoint...");
        // Last resort fallback
        return safeGet(`/onboarding/details?token=${encodedToken}`);
      }
    }
  },

  reviewOnboarding: (data, token) => {
    const endpoint = token
      ? `/onboarding/review?token=${encodeURIComponent(token)}`
      : "/onboarding/review";

    return safePost(endpoint, data);
  },

  getOnboardingDetail: (id) => safeGet(`/onboarding/${id}`),
  rejectOnboardingDocument: (employeeId, entityType, entityId) => {
    return safePost('/onboarding/reject-document', { employeeId, entityType, entityId });
  },

  // --- VENDORS ---
  getVendors: () => safeGet('/vendors'),
  createVendor: (data) => safePost('/vendors', data),
  updateVendor: (id, data) => safePut(`/vendors/${id}`, data),
  deleteVendor: (id) => safeDelete(`/vendors/${id}`),

  // --- VENDOR TYPES ---
  getVendorTypes: () => safeGet('/vendor-types'),
  createVendorType: (data) => safePost('/vendor-types', { typeName: data.typeName || data.name }),
  updateVendorType: (id, data) => safePut(`/vendor-types/${id}`, { typeName: data.typeName || data.name }),
  deleteVendorType: (id) => safeDelete(`/vendor-types/${id}`),

  // --- ASSET TYPES ---
  getAssetTypes: () => safeGet('/asset-types'),
  createAssetType: (data) => safePost('/asset-types', {
    typeName: data.typeName || data.name,
    fields: data.fields || []
  }),
  updateAssetType: (id, data) => safePut(`/asset-types/${id}`, {
    typeName: data.typeName || data.name,
    fields: data.fields || []
  }),
  deleteAssetType: (id) => safeDelete(`/asset-types/${id}`),

  // --- ASSETS ---
  getAssets: () => safeGet('/assets'),
  createAsset: async (formDataOrObject) => {
    if (formDataOrObject instanceof FormData) {
      // 🚀 NEW: Flat FormData built by component
      return safePost('/assets', formDataOrObject);
    }

    // 🏛️ LEGACY: Field-by-field manual build
    const data = new FormData();
    data.append('asset_name', formDataOrObject.assetName || formDataOrObject.name);
    data.append('asset_tag', formDataOrObject.assetTag || formDataOrObject.tag);
    data.append('receiver_name', formDataOrObject.receiverName || '');
    data.append('exchange_type', formDataOrObject.exchangeType || 'Issue');
    data.append('vendor_id', formDataOrObject.vendorId || formDataOrObject.vendor?.vendorId || '');
    data.append('remarks', formDataOrObject.remarks || '');
    if (formDataOrObject.customFields) data.append('custom_fields', JSON.stringify(formDataOrObject.customFields));
    if (formDataOrObject.photoFiles) formDataOrObject.photoFiles.forEach(file => data.append('photo_files', file));
    if (formDataOrObject.invoiceFile) data.append('invoice_file', formDataOrObject.invoiceFile);
    
    return safePost('/assets', data);
  },
  updateAsset: (id, formDataOrObject) => {
    if (formDataOrObject instanceof FormData) {
      // 🚀 NEW: Flat FormData update
      return safePatch(`/assets/${id}`, formDataOrObject);
    }

    // 🏛️ LEGACY: JSON Object
    const payload = {
      asset_name: formDataOrObject.assetName || formDataOrObject.name,
      asset_tag: formDataOrObject.assetTag || formDataOrObject.tag,
      receiver_name: formDataOrObject.receiverName || '',
      exchange_type: formDataOrObject.exchangeType || 'Issue',
      remarks: formDataOrObject.remarks || '',
      custom_fields: formDataOrObject.customFields || {}
    };
    const vId = formDataOrObject.vendorId || formDataOrObject.vendor?.vendorId;
    if (vId) payload.vendor = { vendorId: vId };
    return safePatch(`/assets/${id}`, payload);
  },
  deleteAsset: (id) => safeDelete(`/assets/${id}`),

  getFileUrl: (path) => {
    if (!path) return null;
    const cleanPath = String(path).replace(/\\/g, '/').replace(/^\/+/, '');
    return `${API_BASE_URL}/${cleanPath}`;
  }
};

export default ApiService;