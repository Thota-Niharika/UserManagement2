import axios from "axios";
import { API_BASE_URL } from '../config/api';
import { normalizeEmployee, normalizeEmployeeList } from '../utils/normalizeEmployee';
import { parseIfString } from '../utils/apiUtils';

// --- CLEAN API EXPORTS ---
export const submitOnboarding = async (dto, files = [], token = null) => {
  const formData = new FormData();

  formData.append("dto", JSON.stringify(dto));

  const fileList = Array.isArray(files)
    ? files
    : Object.values(files || {});

  fileList.forEach((file) => {
    if (file) formData.append("files", file);
  });

  const endpoint = token
    ? `/onboarding/submit?token=${encodeURIComponent(token)}`
    : "/onboarding/submit";

  return safePost(endpoint, formData);
};

// ─── HARDENED API CLIENT ──────────────────────────────────────────

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

/**
 * Core GET handler with automatic type-safety and error suppression.
 * NEVER CRASHES THE UI.
 */
export const safeGet = async (url) => {
  try {
    const res = await api.get(url);
    const data = res.data;

    console.log("✅ RAW API RESPONSE:", data); // 👈 ADD THIS

    if (!data) return null;

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
    const isFormData = payload instanceof FormData;
    const res = await api.post(url, payload, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : { 'Content-Type': 'application/json' }
    });
    const parsed = parseIfString(res.data);
    return parsed?.data ?? parsed;
  } catch (err) {
    const msg = getErrorMessage(err);
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
    const raw = await safeGet(`/employees/${id}`);
    return normalizeEmployee(raw);
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
    const raw = await safePost('/employees/employees', payload);
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
  submitOnboarding: (dto, files, token) => {
    return submitOnboarding(dto, files, token);
  },

  getOnboardingByToken: async (token) => {
    if (!token) return null;

    try {
      return await safeGet(
        `/onboarding/get-onboarding-by-token?token=${encodeURIComponent(token)}`
      );
    } catch (err) {
      console.warn("⚠️ Primary failed, trying fallback...");
      return safeGet(`/onboarding/details?token=${encodeURIComponent(token)}`);
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
  createAsset: async (formData) => {
    const data = new FormData();
    data.append('assetName', formData.assetName || formData.name);
    data.append('assetTag', formData.assetTag || formData.tag);
    data.append('receiverName', formData.receiverName || '');
    data.append('exchangeType', formData.exchangeType || 'Issue');
    data.append('vendorId', formData.vendorId || formData.vendor?.vendorId || '');
    data.append('remarks', formData.remarks || '');
    data.append('companyName', formData.companyName || '');
    data.append('generation', formData.generation || '');
    data.append('ram', formData.ram || '');
    data.append('hardDisk', formData.hardDisk || '');
    data.append('procurementType', formData.procurementType || 'Purchasing');
    data.append('purchaseDate', formData.purchaseDate || '');
    data.append('poNumber', formData.poNumber || '');
    data.append('invoiceNumber', formData.invoiceNumber || '');
    data.append('purchaseCost', formData.purchaseCost || '');
    data.append('warrantyPeriod', formData.warrantyPeriod || '');
    data.append('vendorContact', formData.vendorContact || '');
    data.append('deliveryDate', formData.deliveryDate || '');
    data.append('returnDate', formData.returnDate || '');
    data.append('agreementNumber', formData.agreementNumber || '');
    data.append('securityDeposit', formData.securityDeposit || '');
    if (formData.customFields) data.append('customFields', JSON.stringify(formData.customFields));
    if (formData.photoFiles) formData.photoFiles.forEach(file => data.append('files', file));
    return safePost('/assets', data);
  },
  updateAsset: (id, formData) => {
    const payload = {
      assetName: formData.assetName || formData.name,
      assetTag: formData.assetTag || formData.tag,
      receiverName: formData.receiverName || '',
      exchangeType: formData.exchangeType || 'Issue',
      remarks: formData.remarks || '',
      companyName: formData.companyName || '',
      generation: formData.generation || '',
      ram: formData.ram || '',
      hardDisk: formData.hardDisk || '',
      procurementType: formData.procurementType || 'Purchasing',
      purchaseDate: formData.purchaseDate || '',
      poNumber: formData.poNumber || '',
      invoiceNumber: formData.invoiceNumber || '',
      purchaseCost: formData.purchaseCost || '',
      warrantyPeriod: formData.warrantyPeriod || '',
      vendorContact: formData.vendorContact || '',
      deliveryDate: formData.deliveryDate || '',
      returnDate: formData.returnDate || '',
      agreementNumber: formData.agreementNumber || '',
      securityDeposit: formData.securityDeposit || '',
      customFields: formData.customFields || {}
    };
    const vId = formData.vendorId || formData.vendor?.vendorId;
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
