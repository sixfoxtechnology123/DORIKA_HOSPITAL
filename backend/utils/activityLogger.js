const mongoose = require('mongoose');
const ActivityLog = require('../models/ActivityLog');
const UserManagement = require('../models/UserManagement');
const Specialization = require('../models/Specialization');
const Department = require('../models/Department');
const MedicineCategory = require('../models/MedicineCategory');
const Supplier = require('../models/Supplier');
const UnitMeasurement = require('../models/UnitMeasurement');
const Doctor = require('../models/Doctor');
const DoctorSchedule = require('../models/DoctorSchedule');
const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const ConsultationBill = require('../models/ConsultationBillModel');
const Prescription = require('../models/Prescription');
const Medicine = require('../models/Medicine');
const PurchaseOrder = require('../models/PurchaseOrder');
const GRN = require('../models/GRN');
const Stock = require('../models/Stock');
const PharmacyBill = require('../models/PharmacyBill');
const TypeMaster = require('../models/TypeMaster');
const GenericMaster = require('../models/GenericMaster');
const CompanyName = require('../models/CompanyName');

const ROUTE_CONFIGS = [
  { prefix: '/api/master/specialization', module: 'Doctor Specialization', model: Specialization },
  { prefix: '/api/master/department', module: 'Department Master', model: Department },
  { prefix: '/api/master/medicine-category', module: 'Medicine Category Master', model: MedicineCategory },
  { prefix: '/api/master/suppliers', module: 'Supplier Master', model: Supplier },
  { prefix: '/api/master/unit-measurements', module: 'Unit Measurement Master', model: UnitMeasurement },
  { prefix: '/api/doctors', module: 'Doctor Registration', model: Doctor },
  { prefix: '/api/doctor-schedules', module: 'Doctor Schedule', model: DoctorSchedule },
  { prefix: '/api/appointments', module: 'Appointment Booking', model: Appointment },
  { prefix: '/api/patients', module: 'Patient Registration', model: Patient },
  { prefix: '/api/billing', module: 'Consultation Billing', model: ConsultationBill },
  { prefix: '/api/prescriptions', module: 'Prescription', model: Prescription },
  { prefix: '/api/master/medicine', module: 'Medicine Master', model: Medicine },
  { prefix: '/api/purchase-orders', module: 'Purchase Order', model: PurchaseOrder },
  { prefix: '/api/grn', module: 'GRN', model: GRN },
  { prefix: '/api/stock', module: 'Stock', model: Stock },
  { prefix: '/api/pharmacy', module: 'Pharmacy Billing', model: PharmacyBill },
  { prefix: '/api/master/type', module: 'Type Master', model: TypeMaster },
  { prefix: '/api/master/generic', module: 'Generic Master', model: GenericMaster },
  { prefix: '/api/master/company', module: 'Company Name Master', model: CompanyName },
  { prefix: '/api/user-management', module: 'User Management', model: UserManagement },
];

const SENSITIVE_KEYS = new Set(['password', '__v', 'createdAt', 'updatedAt']);
const EXCLUDED_LOG_PATHS = {
  '/api/appointments': new Set(['availableSlotsAtBooking']),
};

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(String(value || ''));

const extractObjectIdFromRequest = (req) => {
  const pathCandidates = [
    req.params?.id,
    req.body?.id,
    req.body?._id,
  ].filter(Boolean);

  const matchedCandidate = pathCandidates.find((value) => isObjectId(value));
  if (matchedCandidate) {
    return matchedCandidate;
  }

  const rawPath = req.originalUrl || req.url || req.path || '';
  const cleanPath = rawPath.split('?')[0];
  const segments = cleanPath.split('/').filter(Boolean);
  const lastSegment = segments[segments.length - 1];

  return isObjectId(lastSegment) ? lastSegment : null;
};

const toPlain = (value) => {
  if (!value) return null;
  if (typeof value.toObject === 'function') return value.toObject();
  return JSON.parse(JSON.stringify(value));
};

const isHiddenField = (key) => key === '_id' || key === 'buffer';

const shouldExcludePath = (route, path = '') => {
  if (!route || !path) return false;
  const excludedPaths = EXCLUDED_LOG_PATHS[route];
  if (!excludedPaths) return false;

  return [...excludedPaths].some(
    (excluded) => path === excluded || path.startsWith(`${excluded}.`)
  );
};

const shouldOmitEmptyValue = (route, value) => {
  if (route !== '/api/patients') return false;
  if (value === '' || value === undefined || value === null) return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return Object.keys(value).length === 0;
  }
  return false;
};

const sanitizeData = (value) => {
  const source = toPlain(value);

  if (source === null || source === undefined) {
    return source;
  }

  if (Array.isArray(source)) {
    return source.map(sanitizeData);
  }

  if (source instanceof Date) {
    return source.toISOString();
  }

  if (source && typeof source === 'object') {
    return Object.entries(source).reduce((acc, [key, current]) => {
      if (SENSITIVE_KEYS.has(key) || isHiddenField(key) || key.startsWith('$')) return acc;
      acc[key] = sanitizeData(current);
      return acc;
    }, {});
  }

  return source;
};

const sanitizeDataForRoute = (value, route, basePath = '') => {
  const source = toPlain(value);

  if (source === null || source === undefined) {
    return source;
  }

  if (shouldExcludePath(route, basePath)) {
    return undefined;
  }

  if (Array.isArray(source)) {
    return source
      .map((item, index) =>
        sanitizeDataForRoute(item, route, basePath ? `${basePath}.${index}` : String(index))
      )
      .filter((item) => item !== undefined);
  }

  if (source instanceof Date) {
    return source.toISOString();
  }

  if (source && typeof source === 'object') {
    return Object.entries(source).reduce((acc, [key, current]) => {
      if (SENSITIVE_KEYS.has(key) || isHiddenField(key) || key.startsWith('$')) return acc;
      const nextPath = basePath ? `${basePath}.${key}` : key;
      const sanitizedValue = sanitizeDataForRoute(current, route, nextPath);
      if (sanitizedValue !== undefined && !shouldOmitEmptyValue(route, sanitizedValue)) {
        acc[key] = sanitizedValue;
      }
      return acc;
    }, {});
  }

  if (shouldOmitEmptyValue(route, source)) {
    return undefined;
  }

  return source;
};

const normalizeForCompare = (value) => {
  const source = sanitizeData(value);

  if (Array.isArray(source)) {
    return source.map((item) => normalizeForCompare(item));
  }

  if (source && typeof source === 'object') {
    return Object.entries(source).reduce((acc, [key, current]) => {
      if (SENSITIVE_KEYS.has(key) || isHiddenField(key) || key.startsWith('$')) return acc;
      acc[key] = normalizeForCompare(current);
      return acc;
    }, {});
  }

  return source ?? null;
};

const formatFieldLabel = (path) =>
  path
    .split('.')
    .map((part) => part.replace(/([a-z])([A-Z])/g, '$1 $2'))
    .join(' > ')
    .toUpperCase();

const mapChangesToObjects = (changes) => {
  if (!changes.length) {
    return { previous: null, current: null };
  }

  const previous = {};
  const current = {};

  changes.forEach((change) => {
    const key = change.path || change.field;
    previous[key] = change.previous;
    current[key] = change.current;
  });

  return { previous, current };
};

const collectFieldChanges = (previous, current, basePath = '', options = {}) => {
  const prevNormalized = normalizeForCompare(previous);
  const currNormalized = normalizeForCompare(current);
  const route = options.route || '';

  if (shouldExcludePath(route, basePath)) {
    return [];
  }

  if (Array.isArray(prevNormalized) || Array.isArray(currNormalized)) {
    const prevArray = Array.isArray(prevNormalized) ? prevNormalized : [];
    const currArray = Array.isArray(currNormalized) ? currNormalized : [];
    const hasNestedObject = [...prevArray, ...currArray].some(
      (item) => item && typeof item === 'object'
    );

    if (!hasNestedObject) {
      if (JSON.stringify(prevArray) === JSON.stringify(currArray)) {
        return [];
      }

      return [
        {
          path: basePath || 'record',
          field: formatFieldLabel(basePath || 'record'),
          previous: prevArray.length ? prevArray : null,
          current: currArray.length ? currArray : null,
        },
      ];
    }

    const maxLength = Math.max(prevArray.length, currArray.length);
    const changes = [];

    for (let index = 0; index < maxLength; index += 1) {
      const nextPath = basePath ? `${basePath}.${index}` : String(index);
      changes.push(
        ...collectFieldChanges(prevArray[index], currArray[index], nextPath, options)
      );
    }

    return changes;
  }

  if (
    prevNormalized &&
    currNormalized &&
    typeof prevNormalized === 'object' &&
    typeof currNormalized === 'object' &&
    !Array.isArray(prevNormalized) &&
    !Array.isArray(currNormalized)
  ) {
    const keys = [...new Set([...Object.keys(prevNormalized), ...Object.keys(currNormalized)])];
    return keys.flatMap((key) => {
      const nextPath = basePath ? `${basePath}.${key}` : key;
      return collectFieldChanges(prevNormalized[key], currNormalized[key], nextPath, options);
    });
  }

  if (JSON.stringify(prevNormalized) === JSON.stringify(currNormalized)) {
    return [];
  }

  return [
    {
      path: basePath || 'record',
      field: formatFieldLabel(basePath || 'record'),
      previous: prevNormalized ?? null,
      current: currNormalized ?? null,
    },
  ];
};

const getRouteConfig = (path) => ROUTE_CONFIGS.find((entry) => path.startsWith(entry.prefix));

const getActionName = (req, previousDoc) => {
  if (req.method === 'DELETE') return 'Delete';
  if (req.method === 'PUT' || req.method === 'PATCH') return 'Update';
  if (req.method === 'POST') return previousDoc || req.body?.id || req.params?.id ? 'Update' : 'Create';
  return req.method;
};

const getRecordId = (req, payloadDocument, previousDoc) => {
  const candidates = [
    extractObjectIdFromRequest(req),
    payloadDocument?._id,
    previousDoc?._id,
  ].filter(Boolean);

  return candidates.find((value) => isObjectId(value)) || candidates[0] || null;
};

const findExistingDocument = async (model, req) => {
  const lookupId = extractObjectIdFromRequest(req);
  if (!lookupId || !model || !isObjectId(lookupId)) return null;

  try {
    return await model.findById(lookupId);
  } catch (error) {
    return null;
  }
};

const extractPayloadDocument = (payload) => {
  if (!payload || typeof payload !== 'object') return null;
  if (payload.data && typeof payload.data === 'object') return payload.data;
  return null;
};

const fetchCurrentDocument = async (model, recordId, fallbackDoc) => {
  if (!model || !recordId || !isObjectId(recordId)) {
    return fallbackDoc || null;
  }

  try {
    const currentDoc = await model.findById(recordId);
    return currentDoc || fallbackDoc || null;
  } catch (error) {
    return fallbackDoc || null;
  }
};

const getTargetDetails = (document, fallbackRecordId = '') => {
  const source = toPlain(document) || {};

  if (source.po_number || source.po_id) {
    return {
      name: [source.po_number, source.po_id].filter(Boolean).join(' | ') || '-',
      employeeID: source.po_id || source.po_number || '-',
    };
  }

  if (source.grn_number || source.grn_id) {
    const nameParts = [source.grn_number, source.grn_id];
    if (source.po_number || source.po_id) {
      nameParts.push([source.po_number, source.po_id].filter(Boolean).join(' | '));
    }

    return {
      name: nameParts.filter(Boolean).join(' | ') || '-',
      employeeID: source.grn_id || source.grn_number || '-',
    };
  }

  if (source.bill_id) {
    return {
      name: [source.bill_id, source.patient_name || source.patientName].filter(Boolean).join(' | ') || '-',
      employeeID: source.bill_id || '-',
    };
  }

  const name =
    source.fullName ||
    [source.firstName, source.middleName, source.lastName].filter(Boolean).join(' ').trim() ||
    source.patientName ||
    source.doctorName ||
    source.companyName ||
    source.supplier_name ||
    source.contact_person ||
    source.base_unit_name ||
    source.purchase_unit_name ||
    source.category_name ||
    source.medicine_name ||
    source.typeName ||
    source.genericName ||
    source.deptName ||
    source.specializationName ||
    source.medicineName ||
    source.supplierName ||
    source.username ||
    source.name ||
    '';

  const employeeID =
    source.deptId ||
    source.unit_id ||
    source.typeId ||
    source.genericId ||
    source.companyId ||
    source.supplier_id ||
    source.category_id ||
    source.categoryId ||
    source.medicine_id ||
    source.medicineId ||
    source.userId ||
    source.patientId ||
    source.doctorId ||
    source.specializationId ||
    source.companyIdNumber ||
    source.supplierId ||
    source.unitId ||
    source.po_id ||
    source.po_number ||
    source.grn_id ||
    source.grn_number ||
    source.stockId ||
    source.appointmentId ||
    source.bill_id ||
    source.billId ||
    source.prescriptionId ||
    fallbackRecordId ||
    '';

  return {
    name: String(name || '').trim() || '-',
    employeeID: String(employeeID || '').trim() || '-',
  };
};

const formatTimestampParts = (dateInput = new Date()) => {
  const date = new Date(dateInput);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const actionDate = `${day}-${month}-${year}`;
  const actionTime = date.toLocaleTimeString('en-US', {
    hour12: true,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return { actionDate, actionTime, actionAt: date };
};

const buildActivityDetails = ({ action, module, previous, current, targetUser, route }) => {
  const targetName = targetUser?.name && targetUser.name !== '-' ? ` - ${targetUser.name}` : '';

  if (action === 'Create') {
    return `CREATE IN ${module.toUpperCase()}${targetName}`;
  }

  if (action === 'Delete') {
    return `DELETE FROM ${module.toUpperCase()}${targetName}`;
  }

  const changes = collectFieldChanges(previous, current, '', { route });
  if (!changes.length) {
    return `UPDATE IN ${module.toUpperCase()}${targetName}`;
  }

  return `UPDATE IN ${module.toUpperCase()}${targetName}`;
};

const getRequestIp = (req) => {
  const forwarded = req?.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }

  return req?.ip || req?.socket?.remoteAddress || '';
};

const buildActor = async (explicitUser, reqUser) => {
  if (explicitUser) {
    return {
      loginUserId: explicitUser.username || explicitUser.userId || '',
      name: explicitUser.fullName || explicitUser.name || explicitUser.username || '',
      role: explicitUser.role || '',
    };
  }

  if (!reqUser?.id || !isObjectId(reqUser.id)) {
    return {
      loginUserId: reqUser?.username || reqUser?.userId || '',
      name: reqUser?.fullName || reqUser?.username || 'SYSTEM',
      role: reqUser?.role || '',
    };
  }

  const user = await UserManagement.findById(reqUser.id).lean();

  return {
    loginUserId: user?.username || reqUser.username || user?.userId || '',
    name: user?.fullName || reqUser.fullName || user?.username || 'SYSTEM',
    role: user?.role || reqUser.role || '',
  };
};

const createActivityLog = async ({
  module,
  action,
  details,
  req,
  explicitUser,
  previous,
  current,
  route,
  targetUser,
  actionAt,
}) => {
  const actor = await buildActor(explicitUser, req?.user);
  const timestamp = formatTimestampParts(actionAt);
  const changes = action === 'Update' ? collectFieldChanges(previous, current, '', { route }) : [];
  const diffSet =
    action === 'Update'
      ? mapChangesToObjects(changes)
      : {
          previous: action === 'Delete' ? sanitizeDataForRoute(previous, route) : null,
          current: action === 'Delete' ? null : sanitizeDataForRoute(current, route),
        };
  const detailText =
    details || buildActivityDetails({ action, module, previous, current, targetUser, route });

  await ActivityLog.create({
    changedBy: actor,
    targetUser: targetUser || getTargetDetails(current || previous),
    changedDetails: {
      module,
      action: String(action || '').toUpperCase(),
      details: detailText,
      ipAddress: getRequestIp(req),
    },
    changedSet: {
      previous: diffSet.previous,
      current: diffSet.current,
    },
    metaData: null,
    text: detailText,
    actionAt: timestamp.actionAt,
    actionDate: timestamp.actionDate,
    actionTime: timestamp.actionTime,
  });
};

const activityAuditMiddleware = async (req, res, next) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }

  const config = getRouteConfig(req.path);
  if (!config) {
    return next();
  }

  req.auditConfig = config;
  req.auditPreviousDocument = await findExistingDocument(config.model, req);

  const originalJson = res.json.bind(res);
  res.json = (payload) => {
    const statusCode = res.statusCode;

    if (statusCode < 400 && payload?.success !== false) {
      const previousDoc = req.auditPreviousDocument;
      const action = getActionName(req, previousDoc);
      const payloadDocument = extractPayloadDocument(payload);
      const recordId = getRecordId(req, payloadDocument, previousDoc);
      const fallbackCurrentDoc =
        req.method === 'DELETE'
          ? null
          : payloadDocument || { ...req.body, _id: recordId || req.body?._id };

      fetchCurrentDocument(config.model, recordId, fallbackCurrentDoc).then((currentDoc) => {
        const resolvedCurrent = req.method === 'DELETE' ? null : currentDoc;
        const targetUser = getTargetDetails(resolvedCurrent || previousDoc, recordId);
        const detailText = buildActivityDetails({
          action,
          module: config.module,
          previous: previousDoc,
          current: resolvedCurrent,
          targetUser,
          route: config.prefix,
        });

        return createActivityLog({
          module: config.module,
          action,
          details: detailText,
          req,
          previous: previousDoc,
          current: resolvedCurrent,
          targetUser,
          route: config.prefix,
        });
      }).catch((error) => {
        console.error('Activity log error:', error.message);
      });
    }

    return originalJson(payload);
  };

  return next();
};

module.exports = {
  activityAuditMiddleware,
  createActivityLog,
};
