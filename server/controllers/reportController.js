const PDFDocument = require('pdfkit');
const asyncHandler = require('../utils/asyncHandler');
const Generator = require('../models/Generator');
const WorkOrder = require('../models/WorkOrder');
const { fleetSummary } = require('../services/analyticsService');

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

// @desc    Generate PDF Report for Generator Fuel and Runtime
// @route   GET /api/reports/fuel-runtime
// @access  Private/Admin,Engineer,NOC Manager
const generateFuelReport = asyncHandler(async (req, res) => {
  const [generators, summary] = await Promise.all([
    Generator.find({}).populate('siteId', 'name'),
    fleetSummary(req.query.range || '7d'),
  ]);

  const doc = new PDFDocument({ margin: 50 });
  res.setHeader('Content-disposition', 'attachment; filename=fuel-runtime-report.pdf');
  res.setHeader('Content-type', 'application/pdf');
  doc.pipe(res);

  doc.fontSize(20).text('GenMonitor System Report', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor('gray').text(`Generated ${new Date().toLocaleString()}  ·  window: ${summary.range}`, { align: 'center' });
  doc.fillColor('black').moveDown();

  doc.fontSize(14).text('Fleet KPIs', { underline: true });
  doc.moveDown(0.3);
  doc.fontSize(11).font('Helvetica');
  doc.text(`Availability: ${summary.availabilityPct ?? 'n/a'}%`);
  doc.text(`MTBF: ${summary.reliability.mtbfHours ?? 'n/a'} h    MTTR: ${summary.reliability.mttrHours ?? 'n/a'} h`);
  doc.text(`Open alerts: ${summary.alertsOpen.total} (critical ${summary.alertsOpen.critical})`);
  doc.text(`Open work orders: ${summary.workOrders.open} (overdue ${summary.workOrders.overdue})`);
  doc.moveDown();

  doc.fontSize(14).font('Helvetica-Bold').text('Fuel Consumption & Runtime', { underline: true });
  doc.moveDown(0.5);

  let totalRuntime = 0;
  let totalDeficit = 0;

  generators.forEach((gen, index) => {
    const fuelLevel = typeof gen.fuelLevel === 'number' ? gen.fuelLevel : 0;
    const runtimeHours = typeof gen.runtimeHours === 'number' ? gen.runtimeHours : 0;

    doc.fontSize(12).font('Helvetica-Bold').text(`${index + 1}. ${gen.generatorId} (${gen.serialNumber || 'n/a'})`);
    doc.font('Helvetica').fontSize(11);
    doc.text(`Site: ${gen.siteId?.name || 'Unassigned'}    Status: ${gen.status}${gen.isDecommissioned ? ' (decommissioned)' : ''}`);
    doc.text(`Fuel: ${fuelLevel.toFixed(1)}%    Runtime: ${runtimeHours.toFixed(1)} h`);
    doc.moveDown(0.5);

    totalRuntime += runtimeHours;
    totalDeficit += 100 - fuelLevel;
  });

  doc.moveDown();
  doc.fontSize(13).font('Helvetica-Bold').text('Totals');
  doc.fontSize(11).font('Helvetica').text(`Aggregated runtime: ${totalRuntime.toFixed(1)} h`);
  doc.text(`Combined fuel deficit: ~${totalDeficit.toFixed(1)}%`);

  doc.end();
});

// @desc    Generate CSV Report for Work Order / Maintenance History
// @route   GET /api/reports/maintenance-csv
// @access  Private/Admin,Engineer,NOC Manager
const generateMaintenanceCSV = asyncHandler(async (req, res) => {
  const workOrders = await WorkOrder.find({})
    .populate({ path: 'generatorId', select: 'generatorId serialNumber', populate: { path: 'siteId', select: 'name' } })
    .populate('assignee', 'name')
    .sort({ createdAt: -1 })
    .lean();

  const header = [
    'Code',
    'Unit',
    'Serial',
    'Site',
    'Type',
    'Priority',
    'Status',
    'Scheduled',
    'SLA Due',
    'Completed',
    'Assignee',
    'Labor Hours',
    'Cost',
    'Title',
  ];

  const rows = workOrders.map((wo) =>
    [
      wo.code,
      wo.generatorId?.generatorId,
      wo.generatorId?.serialNumber,
      wo.generatorId?.siteId?.name,
      wo.type,
      wo.priority,
      wo.status,
      wo.scheduledDate ? new Date(wo.scheduledDate).toISOString().slice(0, 10) : '',
      wo.slaDueAt ? new Date(wo.slaDueAt).toISOString().slice(0, 10) : '',
      wo.completedAt ? new Date(wo.completedAt).toISOString().slice(0, 10) : '',
      wo.assignee?.name,
      wo.laborHours ?? 0,
      wo.costTotal ?? 0,
      wo.title,
    ]
      .map(csvCell)
      .join(',')
  );

  res.setHeader('Content-disposition', 'attachment; filename=work-order-history.csv');
  res.setHeader('Content-type', 'text/csv');
  res.send([header.map(csvCell).join(','), ...rows].join('\n'));
});

module.exports = { generateFuelReport, generateMaintenanceCSV };
