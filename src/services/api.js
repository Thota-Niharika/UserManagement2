import axios from "axios";
import { API_BASE_URL } from '../config/api';
import { normalizeEmployee, normalizeEmployeeList } from '../utils/normalizeEmployee';
import { parseIfString } from '../utils/apiUtils';

// ─── HARDENED API CLIENT ──────────────────────────────────────────

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

/**
 * Core GET handler with automatic type-safety and error suppression.
 * NEVER CRASHES THE UI.
 */
export const safeGet = async (url) => {
  try {
    const res = await api.get(url);

    // Validate Status
    if (res.status !== 200 && res.status !== 201) {
      console.error(`❌ [API] Bad status ${res.status} for ${url}`);
      return [];
    }

    // Handle string/broken JSON
    const data = parseIfString(res.data);

    // Validate JSON Structure
    if (!data || typeof data !== "object") {
      console.warn(`⚠️ [API] Non-JSON or empty response for ${url}:`, data);
      return [];
    }

    // Detect backend error payloads (e.g. { error: "msg", status: 500 })
    if (data.error || (data.status && data.status >= 400)) {
      console.error(`❌ [API] Backend logic error for ${url}:`, data);
      return [];
    }

    // Unwrap Spring Boot "data" or "content" wrappers
    return data.data !== undefined ? data.data : (data.content !== undefined ? data.content : data);
  } catch (err) {
    console.error(`❌ [API FAILED] ${url}:`, err.response?.data || err.message);
    return []; // Return empty array to prevent map() crashes in UI
  }
};

/**
 * Core POST handler. Returns null on failure instead of throwing.
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
    console.error(`❌ [API POST FAILED] ${url}:`, err.response?.data || err.message);
    return null;
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
    console.error(`❌ [API PUT FAILED] ${url}:`, err.response?.data || err.message);
    return null;
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
    console.error(`❌ [API DELETE FAILED] ${url}:`, err.response?.data || err.message);
    return false;
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
    console.error(`❌ [API PATCH FAILED] ${url}:`, err.response?.data || err.message);
    return null;
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
  getEmployees: async (page = 0, size = 50) => {
    const raw = await safeGet(`/employees?page=${page}&size=${size}`);
    return normalizeEmployeeList(raw);
  },
  getEmployeeDetail: async (id) => {
    const raw = await safeGet(`/employees/${id}`);
    return normalizeEmployee(raw);
  },
  createEmployee: async (formData) => {
    const raw = await safePost('/employees/employees', {
      fullName: formData.name,
      dept: formData.department,
      entity: formData.entity,
      role: formData.role,
      dateOfOnboarding: formData.dateOfOnboarding,
      dateOfInterview: formData.dateOfInterview,
      dateOfBirth: formData.dateOfBirth,
      email: formData.email,
      phone: formData.phone,
      status: formData.status || 'ONBOARDING'
    });
    return normalizeEmployee(raw);
  },
  updateEmployee: async (id, formData) => {
    const raw = await safePut(`/employees/${id}`, {
      fullName: formData.name,
      dept: formData.department,
      entity: formData.entity,
      role: formData.role,
      dateOfOnboarding: formData.dateOfOnboarding,
      dateOfInterview: formData.dateOfInterview,
      dateOfBirth: formData.dateOfBirth,
      email: formData.email,
      phone: formData.phone,
      status: formData.status || 'Active'
    });
    return normalizeEmployee(raw);
  },
  deleteEmployee: (id) => safeDelete(`/employees/${id}`),
  activateEmployee: (id) => safePatch(`/employees/${id}/activate`, {}),
  deactivateEmployee: (id) => safePatch(`/employees/${id}/deactivate`, {}),

  // --- ONBOARDING ---
  submitOnboarding: (data, token) => {
    const endpoint = token ? `/onboarding/submit?token=${encodeURIComponent(token)}` : '/onboarding/submit';
    return safePost(endpoint, data);
  },
  getOnboardingByToken: (token) => {
    if (!token) return null;
    return safeGet(`/onboarding/get-onboarding-by-token?token=${encodeURIComponent(token)}`);
  },
  reviewOnboarding: (data, token) => {
    const endpoint = token ? `/onboarding/review?token=${encodeURIComponent(token)}` : '/onboarding/review';
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
