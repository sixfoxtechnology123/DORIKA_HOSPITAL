const ActivityLog = require('../models/ActivityLog');

const normalizePerson = (person = {}, fallback = {}) => ({
  loginUserId: person.loginUserId || person.username || fallback.loginUserId || '',
  name: person.name || fallback.name || '-',
  role: person.role || fallback.role || '',
});

const normalizeLogRow = (row) => {
  const plain = typeof row?.toObject === 'function' ? row.toObject() : row;

  const changedBy = normalizePerson(plain.changedBy, {
    loginUserId: plain.changedBy?.loginUserId || plain.changedBy?.username || '',
    name: plain.changedBy?.name || plain.changedBy?.fullName || '-',
    role: plain.changedBy?.role || '',
  });

  const targetUser = {
    employeeID: plain.targetUser?.employeeID || '-',
    name: plain.targetUser?.name || '-',
  };

  return {
    ...plain,
    changedBy,
    targetUser,
    changedDetails: {
      action: plain.changedDetails?.action || '',
      module: plain.changedDetails?.module || '',
      details: plain.changedDetails?.details || plain.text || '',
      ipAddress: plain.changedDetails?.ipAddress || '',
    },
    changedSet: {
      previous: plain.changedSet?.previous || null,
      current: plain.changedSet?.current || null,
    },
    text: plain.text || plain.changedDetails?.details || '',
    metaData: plain.metaData ?? null,
  };
};

exports.getActivityHistory = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limitParam = String(req.query.limit || '20').toLowerCase();
    const limit = limitParam === 'all' ? 1000 : Math.max(parseInt(limitParam, 10) || 20, 1);
    const skip = (page - 1) * limit;

    const filter = {};

    if (req.query.startDate || req.query.endDate) {
      filter.actionAt = {};

      if (req.query.startDate) {
        filter.actionAt.$gte = new Date(`${req.query.startDate}T00:00:00.000Z`);
      }

      if (req.query.endDate) {
        filter.actionAt.$lte = new Date(`${req.query.endDate}T23:59:59.999Z`);
      }
    }

    const [rawRows, total] = await Promise.all([
      ActivityLog.find(filter).sort({ actionAt: -1 }).skip(skip).limit(limit),
      ActivityLog.countDocuments(filter),
    ]);

    const rows = rawRows.map(normalizeLogRow);

    res.json({ success: true, rows, total });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
