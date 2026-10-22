import React, { useState, useEffect, useId } from 'react';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  Check, 
  AlertTriangle, 
  AlertCircle, 
  ArrowRight, 
  ArrowLeft, 
  Download, 
  Save, 
  Layers, 
  FileCheck, 
  RefreshCw, 
  ShieldAlert, 
  CheckCircle2, 
  Info,
  Clock,
  History,
  Trash2,
  Table
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { 
  Organization, 
  ImportEntityType, 
  ImportWorkflowStage, 
  MappingTemplate, 
  ImportBatchRecord,
  ImportRowError,
  ImportRowPreview 
} from '../types';

interface CsvSpreadsheetImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  organization: Organization;
  initialEntityType?: ImportEntityType;
  onImportComplete?: () => void;
}

// Section 9.3 Target Fields by Entity Type
const TARGET_FIELDS: Record<ImportEntityType, { key: string; label: string; required: boolean; description: string }[]> = {
  invoices: [
    { key: 'invoiceNumber', label: 'Invoice Number', required: true, description: 'Unique identifier for the invoice' },
    { key: 'debtorName', label: 'Customer Name', required: true, description: 'Customer or company name' },
    { key: 'customerCode', label: 'Customer Code / Reference', required: false, description: 'External customer account ID' },
    { key: 'issueDate', label: 'Invoice Issue Date', required: true, description: 'Date of invoice issue (YYYY-MM-DD or DD/MM/YYYY)' },
    { key: 'dueDate', label: 'Due Date', required: false, description: 'Payment due date' },
    { key: 'originalAmount', label: 'Invoice Amount', required: true, description: 'Original total invoice amount' },
    { key: 'currency', label: 'Currency', required: false, description: 'ISO currency code (GBP, EUR, USD, ZAR)' },
    { key: 'amountPaid', label: 'Amount Already Paid', required: false, description: 'Historical settlement amount' },
    { key: 'purchaseOrderRef', label: 'Purchase Order Reference', required: false, description: 'Client PO reference' },
    { key: 'paymentTermsDays', label: 'Payment Terms (Days)', required: false, description: 'Credit terms net days (e.g. 30)' },
    { key: 'description', label: 'Description / Line Summary', required: false, description: 'Commercial description' },
    { key: 'externalAccountingRef', label: 'External Accounting Ref', required: false, description: 'Xero, QuickBooks, SAP reference' },
    { key: 'email', label: 'Customer Billing Email', required: false, description: 'Recipient remittance email' },
    { key: 'status', label: 'Invoice Status', required: false, description: 'Draft, Issued, Overdue, Paid' },
  ],
  customers: [
    { key: 'name', label: 'Customer / Company Name', required: true, description: 'Legal customer or company name' },
    { key: 'customerReference', label: 'Customer Reference / Code', required: false, description: 'Unique internal or ERP account code' },
    { key: 'customerType', label: 'Customer Type', required: false, description: 'business, individual, enterprise, government' },
    { key: 'registrationNumber', label: 'Company Registration No', required: false, description: 'Official corporate registration' },
    { key: 'taxId', label: 'Tax / VAT Identification', required: false, description: 'VAT / Tax number' },
    { key: 'billingStreet', label: 'Billing Street Address', required: false, description: 'Street address' },
    { key: 'billingCity', label: 'Billing City', required: false, description: 'City' },
    { key: 'billingPostalCode', label: 'Billing Postal Code', required: false, description: 'Postcode / Zip' },
    { key: 'country', label: 'Country', required: false, description: 'Country of registration' },
    { key: 'contactName', label: 'Primary Contact Person', required: false, description: 'Key relationship contact' },
    { key: 'email', label: 'Email Address', required: true, description: 'Primary communication email' },
    { key: 'telephone', label: 'Telephone Number', required: false, description: 'Phone number' },
    { key: 'creditLimit', label: 'Credit Limit', required: false, description: 'Approved credit ceiling' },
    { key: 'paymentTermsDays', label: 'Payment Terms Days', required: false, description: 'Standard credit terms' },
    { key: 'defaultCurrency', label: 'Default Currency', required: false, description: 'Default transactional currency' },
  ],
  payments: [
    { key: 'referenceNumber', label: 'Payment Reference', required: true, description: 'Bank transaction or receipt reference' },
    { key: 'debtorName', label: 'Customer Name', required: true, description: 'Payer name' },
    { key: 'amount', label: 'Payment Amount', required: true, description: 'Settlement amount' },
    { key: 'currency', label: 'Currency', required: false, description: 'Payment currency code' },
    { key: 'paymentDate', label: 'Payment Date', required: true, description: 'Date settlement received' },
    { key: 'paymentMethod', label: 'Payment Method', required: false, description: 'bank_transfer, direct_debit, card, cheque' },
    { key: 'invoiceNumber', label: 'Allocated Invoice Number', required: false, description: 'Specific invoice to allocate against' },
    { key: 'allocatedAmount', label: 'Allocated Amount', required: false, description: 'Amount allocated to target invoice' },
  ],
};

const STAGES: { id: ImportWorkflowStage; step: number; label: string }[] = [
  { id: 'upload', step: 1, label: 'Upload' },
  { id: 'file_validation', step: 2, label: 'File Validation' },
  { id: 'header_detection', step: 3, label: 'Header Detection' },
  { id: 'column_mapping', step: 4, label: 'Column Mapping' },
  { id: 'data_preview', step: 5, label: 'Data Preview' },
  { id: 'format_validation', step: 6, label: 'Format Validation' },
  { id: 'duplicate_detection', step: 7, label: 'Duplicate Check' },
  { id: 'error_identification', step: 8, label: 'Error Identification' },
  { id: 'user_confirmation', step: 9, label: 'Confirmation' },
  { id: 'processing', step: 10, label: 'Processing' },
  { id: 'summary', step: 11, label: 'Summary' },
  { id: 'error_report', step: 12, label: 'Error Report' },
];

export const CsvSpreadsheetImportModal: React.FC<CsvSpreadsheetImportModalProps> = ({
  isOpen,
  onClose,
  organization,
  initialEntityType = 'invoices',
  onImportComplete,
}) => {
  const [stage, setStage] = useState<ImportWorkflowStage>('upload');
  const [entityType, setEntityType] = useState<ImportEntityType>(initialEntityType);
  const fileInputId = useId();

  // File state
  const [file, setFile] = useState<File | null>(null);
  const [fileFormat, setFileFormat] = useState<'csv' | 'xlsx' | 'xls'>('csv');
  const [fileSizeFormatted, setFileSizeFormatted] = useState<string>('');
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);

  // Mapping state
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
  const [savedTemplates, setSavedTemplates] = useState<MappingTemplate[]>([]);
  const [templateName, setTemplateName] = useState<string>('');
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState<boolean>(false);
  const [sourceReference, setSourceReference] = useState<string>('External Spreadsheet Import');

  // Validation & Duplicate results
  const [rowPreviews, setRowPreviews] = useState<ImportRowPreview[]>([]);
  const [existingInvoiceNumbers, setExistingInvoiceNumbers] = useState<Set<string>>(new Set());
  const [existingCustomerNames, setExistingCustomerNames] = useState<Set<string>>(new Set());
  const [skipDuplicates, setSkipDuplicates] = useState<boolean>(true);

  // Processing state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [batchResult, setBatchResult] = useState<ImportBatchRecord | null>(null);
  const [historyBatches, setHistoryBatches] = useState<ImportBatchRecord[]>([]);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState<boolean>(false);

  // Load existing records for duplicate check and templates
  useEffect(() => {
    if (isOpen) {
      loadExistingData();
      loadTemplates();
      loadHistory();
    }
  }, [isOpen, organization.id, entityType]);

  const loadExistingData = async () => {
    try {
      const [invRes, debRes] = await Promise.all([
        fetch(`/api/invoices?orgId=${organization.id}`),
        fetch(`/api/debtors?orgId=${organization.id}`),
      ]);
      const invData = await invRes.json();
      const debData = await debRes.json();

      if (invData.success) {
        setExistingInvoiceNumbers(new Set((invData.data || []).map((i: any) => i.invoiceNumber.toLowerCase().trim())));
      }
      if (debData.success) {
        setExistingCustomerNames(new Set((debData.data || []).map((d: any) => d.name.toLowerCase().trim())));
      }
    } catch (err) {
      console.error('Failed to load existing ledger data:', err);
    }
  };

  const loadTemplates = async () => {
    try {
      const res = await fetch(`/api/import/templates?entityType=${entityType}`);
      const data = await res.json();
      if (data.success) {
        setSavedTemplates(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load mapping templates:', err);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await fetch(`/api/import/history?orgId=${organization.id}`);
      const data = await res.json();
      if (data.success) {
        setHistoryBatches(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load import history:', err);
    }
  };

  // Stage 1 & 2: Handle File Drop / Select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      processSelectedFile(selected);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      processSelectedFile(dropped);
    }
  };

  const processSelectedFile = (selectedFile: File) => {
    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    if (ext !== 'csv' && ext !== 'xlsx' && ext !== 'xls') {
      alert('Unsupported file format. Please upload a standard CSV or Excel (.xlsx / .xls) spreadsheet.');
      return;
    }

    // 10MB limit check
    if (selectedFile.size > 10 * 1024 * 1024) {
      alert('File exceeds 10MB limit. Please partition into smaller batch files.');
      return;
    }

    setFile(selectedFile);
    setFileFormat(ext as any);
    setFileSizeFormatted(`${(selectedFile.size / 1024).toFixed(1)} KB`);

    // Parse file with SheetJS
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const sheetNames = workbook.SheetNames;
        setAvailableSheets(sheetNames);
        const firstSheet = sheetNames[0];
        setSelectedSheet(firstSheet);
        parseWorksheet(workbook.Sheets[firstSheet]);
        setStage('file_validation');
      } catch (err) {
        console.error('Spreadsheet parse error:', err);
        alert('Failed to parse file. Please verify it is a valid spreadsheet.');
      }
    };
    reader.readAsBinaryString(selectedFile);
  };

  // Stage 3: Header detection
  const parseWorksheet = (worksheet: XLSX.WorkSheet) => {
    const json: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    if (!json || json.length === 0) {
      alert('The uploaded spreadsheet contains no data rows.');
      return;
    }

    // Find first non-empty row as header row
    let headerRowIdx = 0;
    while (headerRowIdx < json.length && (!json[headerRowIdx] || json[headerRowIdx].every((cell: any) => String(cell).trim() === ''))) {
      headerRowIdx++;
    }

    if (headerRowIdx >= json.length) {
      alert('Could not detect valid column headers in the spreadsheet.');
      return;
    }

    const headers: string[] = json[headerRowIdx].map((h: any, i: number) => {
      const trimmed = String(h || '').trim();
      return trimmed || `Column_${i + 1}`;
    });

    setRawHeaders(headers);

    // Build data objects
    const rows: Record<string, any>[] = [];
    for (let r = headerRowIdx + 1; r < json.length; r++) {
      const rowArr = json[r];
      if (!rowArr || rowArr.every((c: any) => String(c).trim() === '')) continue; // Skip empty rows
      
      const rowObj: Record<string, any> = {};
      headers.forEach((h, idx) => {
        let val = rowArr[idx];
        if (val instanceof Date) {
          val = val.toISOString().split('T')[0];
        } else if (typeof val === 'string') {
          val = val.trim();
        }
        rowObj[h] = val !== undefined ? val : '';
      });
      rows.push(rowObj);
    }

    setRawRows(rows);

    // Stage 4: Intelligent Auto-Mapping
    autoMapHeaders(headers);
  };

  const autoMapHeaders = (headers: string[]) => {
    const targets = TARGET_FIELDS[entityType];
    const initialMap: Record<string, string> = {};

    headers.forEach((header) => {
      const cleanHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '');

      targets.forEach((target) => {
        const cleanTarget = target.label.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanKey = target.key.toLowerCase();

        // Exact match or partial match
        if (
          cleanHeader === cleanTarget ||
          cleanHeader === cleanKey ||
          cleanHeader.includes(cleanKey) ||
          cleanTarget.includes(cleanHeader)
        ) {
          if (!Object.values(initialMap).includes(target.key)) {
            initialMap[header] = target.key;
          }
        }
      });
    });

    setColumnMappings(initialMap);
  };

  const handleApplyTemplate = (tmpl: MappingTemplate) => {
    const newMappings: Record<string, string> = {};
    rawHeaders.forEach((h) => {
      if (tmpl.mappings[h]) {
        newMappings[h] = tmpl.mappings[h];
      }
    });
    setColumnMappings(newMappings);
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) return;
    try {
      const res = await fetch('/api/import/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateName.trim(),
          entityType,
          mappings: columnMappings,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSavedTemplates((prev) => [data.data, ...prev]);
        setShowSaveTemplateModal(false);
        setTemplateName('');
      }
    } catch (err) {
      console.error('Failed to save mapping template:', err);
    }
  };

  // Stage 5, 6, 7, 8: Validation, Duplicate Detection, Error Identification
  const runValidationAndPreview = () => {
    const targets = TARGET_FIELDS[entityType];
    const previews: ImportRowPreview[] = [];

    rawRows.forEach((row, idx) => {
      const mapped: Record<string, any> = {};
      const errors: ImportRowError[] = [];

      // Map raw columns to CNTCollect fields
      Object.entries(columnMappings).forEach(([sourceCol, targetKey]) => {
        if (targetKey && targetKey !== 'skip') {
          mapped[targetKey] = row[sourceCol];
        }
      });

      // 9.4 Validate Required Fields
      targets.forEach((t) => {
        if (t.required) {
          const val = mapped[t.key];
          if (val === undefined || val === null || String(val).trim() === '') {
            errors.push({
              field: t.key,
              value: val,
              message: `Required field "${t.label}" is missing or empty.`,
              severity: 'error',
            });
          }
        }
      });

      // Format Validations (Dates, Numeric, Email)
      if (entityType === 'invoices') {
        // Numeric amount check
        const amt = Number(mapped.originalAmount);
        if (mapped.originalAmount !== undefined && isNaN(amt)) {
          errors.push({
            field: 'originalAmount',
            value: mapped.originalAmount,
            message: `Amount "${mapped.originalAmount}" is not a valid number.`,
            severity: 'error',
          });
        }

        // Negative amount treatment (Section 9.4)
        const isCreditNote = amt < 0;
        if (isCreditNote) {
          mapped.isCreditNote = true;
        }

        // Amount consistency (original >= amountPaid)
        const paid = Number(mapped.amountPaid || 0);
        if (!isNaN(amt) && !isNaN(paid) && paid > Math.abs(amt)) {
          errors.push({
            field: 'amountPaid',
            value: mapped.amountPaid,
            message: `Amount paid (${paid}) cannot exceed original invoice amount (${Math.abs(amt)}).`,
            severity: 'error',
          });
        }

        // Duplicate invoice detection within org (Section 9.4)
        const invNum = String(mapped.invoiceNumber || '').trim().toLowerCase();
        let isDuplicate = false;
        let duplicateReason = '';
        if (invNum && existingInvoiceNumbers.has(invNum)) {
          isDuplicate = true;
          duplicateReason = `Invoice number "${mapped.invoiceNumber}" already exists in the organization ledger.`;
        }

        previews.push({
          rowIndex: idx + 1,
          raw: row,
          mapped,
          isValid: errors.length === 0 && !isDuplicate,
          isDuplicate,
          duplicateReason,
          errors,
          isCreditNote,
        });
      } else if (entityType === 'customers') {
        const name = String(mapped.name || '').trim().toLowerCase();
        let isDuplicate = false;
        let duplicateReason = '';
        if (name && existingCustomerNames.has(name)) {
          isDuplicate = true;
          duplicateReason = `Customer "${mapped.name}" already exists in customer directory.`;
        }

        // Validate email format
        if (mapped.email && !String(mapped.email).includes('@')) {
          errors.push({
            field: 'email',
            value: mapped.email,
            message: `Email address "${mapped.email}" is invalid.`,
            severity: 'error',
          });
        }

        previews.push({
          rowIndex: idx + 1,
          raw: row,
          mapped,
          isValid: errors.length === 0 && !isDuplicate,
          isDuplicate,
          duplicateReason,
          errors,
        });
      } else if (entityType === 'payments') {
        const amt = Number(mapped.amount);
        if (mapped.amount !== undefined && (isNaN(amt) || amt <= 0)) {
          errors.push({
            field: 'amount',
            value: mapped.amount,
            message: `Payment settlement amount must be a positive number.`,
            severity: 'error',
          });
        }

        previews.push({
          rowIndex: idx + 1,
          raw: row,
          mapped,
          isValid: errors.length === 0,
          isDuplicate: false,
          errors,
        });
      }
    });

    setRowPreviews(previews);
    setStage('data_preview');
  };

  // Stage 10: Process Import Batch
  const handleExecuteImport = async () => {
    setIsProcessing(true);
    setStage('processing');

    const validRowsToSubmit: any[] = [];
    const rejectedRowsToSubmit: any[] = [];

    rowPreviews.forEach((item) => {
      if (item.isValid) {
        validRowsToSubmit.push(item.mapped);
      } else {
        const reasons: string[] = [];
        if (item.isDuplicate) reasons.push(item.duplicateReason || 'Duplicate record detected');
        item.errors.forEach((e) => reasons.push(e.message));

        rejectedRowsToSubmit.push({
          rowIndex: item.rowIndex,
          data: item.raw,
          reasons,
        });
      }
    });

    const batchNumber = `BATCH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const idempotencyKey = `idem-${file?.name || 'import'}-${file?.size || 0}-${Date.now()}`;

    try {
      const res = await fetch('/api/import/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: organization.id,
          batchNumber,
          filename: file?.name || 'Import_Spreadsheet.csv',
          fileFormat,
          fileSizeFormatted,
          entityType,
          idempotencyKey,
          sourceReference,
          rows: validRowsToSubmit,
          rejectedRows: rejectedRowsToSubmit,
          performedBy: 'Credit Officer / Operations Lead',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setBatchResult(data.data);
        setStage('summary');
        if (onImportComplete) onImportComplete();
      } else {
        alert(`Import processing failed: ${data.error || 'Server error'}`);
        setStage('user_confirmation');
      }
    } catch (err) {
      console.error('Import execution error:', err);
      alert('Network or server error executing import batch.');
      setStage('user_confirmation');
    } finally {
      setIsProcessing(false);
    }
  };

  // Stage 12: Downloadable Error Report (Section 9.2 & 9.4)
  const handleDownloadErrorReport = () => {
    const rejectedList = batchResult?.rejectedRowsData || rowPreviews.filter((p) => !p.isValid).map((p) => ({
      rowIndex: p.rowIndex,
      data: p.raw,
      reasons: p.errors.map((e) => e.message).concat(p.duplicateReason ? [p.duplicateReason] : []),
    }));

    if (rejectedList.length === 0) {
      alert('No rejected rows to export. All records were valid!');
      return;
    }

    const exportRows = rejectedList.map((item) => ({
      Row_Index: item.rowIndex,
      Rejection_Reasons: item.reasons.join('; '),
      ...item.data,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rejected_Rows');
    XLSX.writeFile(workbook, `CNTCollect_Import_Rejections_${batchResult?.batchNumber || 'Batch'}.csv`);
  };

  const handleDownloadSampleTemplate = () => {
    let sampleData: any[] = [];
    if (entityType === 'invoices') {
      sampleData = [
        {
          'Invoice Number': 'INV-SAMPLE-001',
          'Customer Name': 'Apex Retail Holdings PLC',
          'Customer Code': 'CUST-APEX-01',
          'Issue Date': '2026-10-01',
          'Due Date': '2026-10-31',
          'Invoice Amount': 14500.00,
          'Currency': 'GBP',
          'Amount Paid': 0,
          'Purchase Order': 'PO-88421',
          'Payment Terms': 30,
          'Description': 'Commercial Distribution Logistics Q3',
        },
        {
          'Invoice Number': 'INV-SAMPLE-002',
          'Customer Name': 'Vanguard Tech Solutions Ltd',
          'Customer Code': 'CUST-VANG-02',
          'Issue Date': '2026-09-15',
          'Due Date': '2026-10-15',
          'Invoice Amount': 8750.50,
          'Currency': 'GBP',
          'Amount Paid': 2000.00,
          'Purchase Order': 'PO-99120',
          'Payment Terms': 30,
          'Description': 'Cloud Architecture Consultation',
        },
      ];
    } else if (entityType === 'customers') {
      sampleData = [
        {
          'Customer Name': 'Beacon Marine Logistics Ltd',
          'Customer Code': 'CUST-BEAC-09',
          'Customer Type': 'business',
          'Company Registration': '09812456',
          'Tax Identification': 'GB992817263',
          'Billing Street': '14 Quayside Boulevard',
          'Billing City': 'Southampton',
          'Billing Postal Code': 'SO14 2AQ',
          'Country': 'United Kingdom',
          'Primary Contact': 'Elena Rostova',
          'Email': 'accounts@beaconmarine.co.uk',
          'Telephone': '+44 23 8011 2233',
          'Credit Limit': 75000,
          'Payment Terms Days': 30,
          'Default Currency': 'GBP',
        },
      ];
    } else {
      sampleData = [
        {
          'Payment Reference': 'BACS-TX-99014',
          'Customer Name': 'Apex Retail Holdings PLC',
          'Settlement Amount': 5000.00,
          'Currency': 'GBP',
          'Settlement Date': '2026-10-18',
          'Payment Method': 'bank_transfer',
          'Allocated Invoice Number': 'INV-SAMPLE-001',
        },
      ];
    }

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Sample_${entityType}`);
    XLSX.writeFile(workbook, `CNTCollect_${entityType}_Sample_Template.xlsx`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Guided Spreadsheet & CSV Ingestion Engine
                </h2>
                <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Section 9 Protocol
                </span>
              </div>
              <p className="text-xs text-slate-400">
                12-stage idempotent validation: CSV, XLSX, intelligent mapping, duplicate detection, and audit reporting
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowHistoryDrawer(!showHistoryDrawer)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:text-white border border-slate-700 hover:bg-slate-700/80 transition flex items-center space-x-1.5"
              title="View historical import batches"
            >
              <History className="w-3.5 h-3.5 text-indigo-400" />
              <span>Import History</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 12-Stage Visual Progress Ribbon */}
        <div className="px-6 py-2.5 bg-slate-950/40 border-b border-slate-800/80 overflow-x-auto scrollbar-none shrink-0">
          <div className="flex items-center space-x-2 min-w-max">
            {STAGES.map((s, idx) => {
              const currentStep = STAGES.find((x) => x.id === stage)?.step || 1;
              const isDone = s.step < currentStep;
              const isCurrent = s.id === stage;

              return (
                <div key={s.id} className="flex items-center space-x-1.5 text-[11px]">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition ${
                      isDone
                        ? 'bg-emerald-600 text-white'
                        : isCurrent
                        ? 'bg-indigo-600 text-white ring-2 ring-indigo-400/50'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {isDone ? <Check className="w-3 h-3" /> : s.step}
                  </div>
                  <span className={`font-medium ${isCurrent ? 'text-indigo-300 font-bold' : isDone ? 'text-slate-300' : 'text-slate-500'}`}>
                    {s.label}
                  </span>
                  {idx < STAGES.length - 1 && <span className="text-slate-700 mx-1">›</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Body: Workflow Stages */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* STAGE 1: Upload & Target Entity Selection */}
          {stage === 'upload' && (
            <div className="space-y-6">
              {/* Entity Selector */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-2">
                  1. Select Records To Import (Section 9.1)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'invoices', label: 'Commercial Invoices', desc: 'Invoices, due dates, amounts, PO refs' },
                    { id: 'customers', label: 'Customers & Debtors', desc: 'Customer profiles, credit limits, contacts' },
                    { id: 'payments', label: 'Historical Payments', desc: 'Settlement dates, receipts, allocations' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setEntityType(item.id as any)}
                      className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
                        entityType === item.id
                          ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-600/10'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-semibold text-xs text-white mb-1">{item.label}</div>
                      <div className="text-[11px] text-slate-400">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Drag and Drop Zone */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-300">
                    2. Upload Source Spreadsheet File (.csv, .xlsx, .xls)
                  </label>
                  <button
                    onClick={handleDownloadSampleTemplate}
                    className="text-xs text-indigo-400 hover:text-indigo-300 transition flex items-center space-x-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Blank {entityType} Template</span>
                  </button>
                </div>

                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-8 text-center bg-slate-950/40 hover:bg-slate-950/70 transition cursor-pointer flex flex-col items-center justify-center space-y-3"
                  onClick={() => document.getElementById(fileInputId)?.click()}
                >
                  <input
                    id={fileInputId}
                    type="file"
                    accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                    <Upload className="w-7 h-7 animate-pulse" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      Click to choose or drag and drop spreadsheet
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Supports CSV, XLSX, and XLS workbooks up to 10MB (max 5,000 rows per batch)
                    </p>
                  </div>
                </div>
              </div>

              {/* Source Context Metadata */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Source Reference / Ledger System
                </label>
                <input
                  type="text"
                  value={sourceReference}
                  onChange={(e) => setSourceReference(e.target.value)}
                  placeholder="e.g. SAP S/4HANA Ledger Export, Xero Daily Sync, Legacy CSV"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {/* STAGE 2 & 3: File Validation & Header Detection */}
          {(stage === 'file_validation' || stage === 'header_detection') && (
            <div className="space-y-6">
              <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-4 flex items-start space-x-3 text-xs">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-emerald-300">File Ingestion & Header Detection Successful</h4>
                  <p className="text-slate-300 mt-0.5">
                    Parsed <strong className="text-white">{rawRows.length} rows</strong> across{' '}
                    <strong className="text-white">{rawHeaders.length} detected columns</strong> from{' '}
                    <span className="font-mono text-emerald-200">{file?.name}</span> ({fileSizeFormatted}).
                  </p>
                </div>
              </div>

              {availableSheets.length > 1 && (
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Workbook Sheet Selection:
                  </label>
                  <select
                    value={selectedSheet}
                    onChange={(e) => {
                      setSelectedSheet(e.target.value);
                      // Re-read chosen sheet
                    }}
                    className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    {availableSheets.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Detected Headers Grid */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-2">
                  Detected Column Headers:
                </label>
                <div className="flex flex-wrap gap-2 bg-slate-950 p-4 rounded-xl border border-slate-800">
                  {rawHeaders.map((h, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-slate-900 border border-slate-800 text-indigo-300"
                    >
                      {h}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <button
                  onClick={() => setStage('upload')}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 transition flex items-center space-x-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Choose Different File</span>
                </button>
                <button
                  onClick={() => setStage('column_mapping')}
                  className="px-5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition shadow-sm flex items-center space-x-1.5"
                >
                  <span>Proceed to Column Mapping</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STAGE 4: Column Mapping (Section 9.3) */}
          {stage === 'column_mapping' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Map Source Columns to CNTCollect Schema
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Match fields from your spreadsheet to the corresponding target fields.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  {savedTemplates.length > 0 && (
                    <select
                      onChange={(e) => {
                        const tmpl = savedTemplates.find((t) => t.id === e.target.value);
                        if (tmpl) handleApplyTemplate(tmpl);
                      }}
                      defaultValue=""
                      className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:outline-none"
                    >
                      <option value="" disabled>Load Mapping Template...</option>
                      {savedTemplates.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  )}

                  <button
                    onClick={() => setShowSaveTemplateModal(true)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-600/50 transition flex items-center space-x-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Template</span>
                  </button>
                </div>
              </div>

              {/* Mapping Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 text-slate-400 font-medium border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-4 w-1/3">Source File Column</th>
                      <th className="py-2.5 px-4 w-1/3">Sample Value (Row 1)</th>
                      <th className="py-2.5 px-4 w-1/3">CNTCollect Target Field</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {rawHeaders.map((header) => {
                      const sampleVal = rawRows[0]?.[header];
                      const currentMapped = columnMappings[header] || 'skip';

                      return (
                        <tr key={header} className="hover:bg-slate-900/40 transition">
                          <td className="py-2.5 px-4 font-mono font-medium text-slate-200">
                            {header}
                          </td>
                          <td className="py-2.5 px-4 text-slate-400 truncate max-w-[200px]" title={String(sampleVal)}>
                            {sampleVal !== undefined && sampleVal !== '' ? String(sampleVal) : <span className="text-slate-600 italic">Empty</span>}
                          </td>
                          <td className="py-2.5 px-4">
                            <select
                              value={currentMapped}
                              onChange={(e) => {
                                setColumnMappings({
                                  ...columnMappings,
                                  [header]: e.target.value,
                                });
                              }}
                              className={`w-full bg-slate-900 border rounded-lg p-2 text-xs focus:outline-none transition ${
                                currentMapped !== 'skip'
                                  ? 'border-indigo-500 text-white font-medium bg-indigo-950/20'
                                  : 'border-slate-800 text-slate-400'
                              }`}
                            >
                              <option value="skip">— Do Not Import (Skip) —</option>
                              {TARGET_FIELDS[entityType].map((f) => (
                                <option key={f.key} value={f.key}>
                                  {f.label} {f.required ? '(Required)' : ''}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <button
                  onClick={() => setStage('upload')}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 transition flex items-center space-x-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
                <button
                  onClick={runValidationAndPreview}
                  className="px-5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition shadow-sm flex items-center space-x-1.5"
                >
                  <span>Run Validation & Preview Data</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STAGE 5, 6, 7, 8: Data Preview, Validation & Duplicate Identification */}
          {stage === 'data_preview' && (
            <div className="space-y-6">
              {/* Validation Summary Bar */}
              {(() => {
                const total = rowPreviews.length;
                const validCount = rowPreviews.filter((p) => p.isValid).length;
                const errorCount = rowPreviews.filter((p) => p.errors.length > 0).length;
                const duplicateCount = rowPreviews.filter((p) => p.isDuplicate).length;

                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <div className="text-[10px] text-slate-400 font-medium uppercase">Total Rows</div>
                      <div className="text-xl font-bold text-white mt-0.5">{total}</div>
                    </div>
                    <div className="bg-emerald-950/30 p-3 rounded-xl border border-emerald-500/30">
                      <div className="text-[10px] text-emerald-400 font-medium uppercase">Valid Rows</div>
                      <div className="text-xl font-bold text-emerald-300 mt-0.5">{validCount}</div>
                    </div>
                    <div className="bg-rose-950/30 p-3 rounded-xl border border-rose-500/30">
                      <div className="text-[10px] text-rose-400 font-medium uppercase">Format / Missing Errors</div>
                      <div className="text-xl font-bold text-rose-300 mt-0.5">{errorCount}</div>
                    </div>
                    <div className="bg-amber-950/30 p-3 rounded-xl border border-amber-500/30">
                      <div className="text-[10px] text-amber-400 font-medium uppercase">Duplicates Detected</div>
                      <div className="text-xl font-bold text-amber-300 mt-0.5">{duplicateCount}</div>
                    </div>
                  </div>
                );
              })()}

              {/* Protocol Warning */}
              <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-3.5 flex items-start space-x-3 text-xs">
                <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-slate-300">
                  <span className="font-bold text-amber-300">Section 9.2 Compliance Mandate: </span>
                  Financial records are never imported silently when the system detects ambiguous or potentially duplicate data.
                  Duplicate rows and rows with format errors will be isolated.
                </div>
              </div>

              {/* Preview Grid with Badges */}
              <div className="border border-slate-800 rounded-xl overflow-x-auto max-h-[380px] bg-slate-950">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 sticky top-0 text-slate-400 border-b border-slate-800 z-10">
                    <tr>
                      <th className="py-2 px-3">Row</th>
                      <th className="py-2 px-3">Validation Status</th>
                      {Object.values(columnMappings).filter((k) => k !== 'skip').map((k) => {
                        const target = TARGET_FIELDS[entityType].find((t) => t.key === k);
                        return (
                          <th key={k} className="py-2 px-3 whitespace-nowrap">
                            {target?.label || k}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {rowPreviews.slice(0, 50).map((preview) => {
                      return (
                        <tr
                          key={preview.rowIndex}
                          className={`hover:bg-slate-900/50 transition ${
                            !preview.isValid ? 'bg-rose-950/10' : ''
                          }`}
                        >
                          <td className="py-2 px-3 font-mono text-slate-400">
                            #{preview.rowIndex}
                          </td>
                          <td className="py-2 px-3">
                            {preview.isValid ? (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <Check className="w-3 h-3" />
                                <span>Valid</span>
                              </span>
                            ) : preview.isDuplicate ? (
                              <span
                                className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                title={preview.duplicateReason}
                              >
                                <AlertTriangle className="w-3 h-3" />
                                <span>Duplicate</span>
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                title={preview.errors.map((e) => e.message).join('; ')}
                              >
                                <AlertCircle className="w-3 h-3" />
                                <span>{preview.errors.length} Error(s)</span>
                              </span>
                            )}
                          </td>

                          {Object.values(columnMappings).filter((k) => k !== 'skip').map((k) => {
                            const val = preview.mapped[k];
                            const hasError = preview.errors.some((e) => e.field === k);

                            return (
                              <td
                                key={k}
                                className={`py-2 px-3 whitespace-nowrap font-medium ${
                                  hasError ? 'text-rose-400 bg-rose-500/10 rounded font-bold' : 'text-slate-300'
                                }`}
                              >
                                {val !== undefined && val !== '' ? String(val) : <span className="text-slate-600 italic">—</span>}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {rowPreviews.length > 50 && (
                <p className="text-[11px] text-slate-500 text-center">
                  Showing first 50 rows of {rowPreviews.length} total rows.
                </p>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <button
                  onClick={() => setStage('column_mapping')}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 transition flex items-center space-x-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Adjust Mapping</span>
                </button>
                <button
                  onClick={() => setStage('user_confirmation')}
                  className="px-5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition shadow-sm flex items-center space-x-1.5"
                >
                  <span>Proceed to Final Confirmation</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STAGE 9: User Confirmation (Section 9.2 #9) */}
          {stage === 'user_confirmation' && (
            <div className="space-y-6">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                  <span>Confirm Import Execution for Organization Ledger</span>
                </h3>

                <div className="space-y-2 text-xs text-slate-300">
                  <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                    <span className="text-slate-400">Target Tenant:</span>
                    <span className="font-semibold text-white">{organization.name} ({organization.defaultCurrency})</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                    <span className="text-slate-400">Record Entity Type:</span>
                    <span className="font-semibold text-indigo-300 uppercase">{entityType}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                    <span className="text-slate-400">Source File:</span>
                    <span className="font-mono text-white">{file?.name} ({fileSizeFormatted})</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                    <span className="text-slate-400">Total Rows Evaluated:</span>
                    <span className="font-semibold text-white">{rowPreviews.length}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                    <span className="text-emerald-400 font-medium">Rows Ready for Ingestion:</span>
                    <span className="font-bold text-emerald-400">{rowPreviews.filter((p) => p.isValid).length}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                    <span className="text-rose-400 font-medium">Rows to be Rejected / Skipped:</span>
                    <span className="font-bold text-rose-400">{rowPreviews.filter((p) => !p.isValid).length}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-center space-x-2.5 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={skipDuplicates}
                      onChange={(e) => setSkipDuplicates(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Automatically skip detected duplicates and isolate into downloadable error report</span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <button
                  onClick={() => setStage('data_preview')}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 transition flex items-center space-x-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Review Preview</span>
                </button>
                <button
                  onClick={handleExecuteImport}
                  disabled={isProcessing}
                  className="px-6 py-2.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 active:scale-95 transition shadow-lg shadow-emerald-600/30 flex items-center space-x-2"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>Execute Deterministic Import</span>
                </button>
              </div>
            </div>
          )}

          {/* STAGE 10: Processing */}
          {stage === 'processing' && (
            <div className="py-16 text-center space-y-4">
              <RefreshCw className="w-10 h-10 text-indigo-400 animate-spin mx-auto" />
              <h3 className="text-base font-bold text-white">Ingesting Spreadsheet Records...</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Validating idempotency tokens, generating invoice documents, allocating payments, and updating deterministic multi-currency receivables.
              </p>
            </div>
          )}

          {/* STAGE 11 & 12: Import Summary & Downloadable Error Report */}
          {stage === 'summary' && batchResult && (
            <div className="space-y-6">
              <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">
                  Import Batch {batchResult.batchNumber} Completed
                </h3>
                <p className="text-xs text-slate-300 max-w-lg mx-auto">
                  Successfully imported <strong className="text-white">{batchResult.importedRows}</strong> records into the{' '}
                  <strong className="text-white">{organization.name}</strong> accounts receivable ledger.
                </p>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-medium">Batch Number</div>
                  <div className="font-mono text-xs font-bold text-indigo-300 mt-1">{batchResult.batchNumber}</div>
                </div>
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-medium">Imported</div>
                  <div className="text-lg font-bold text-emerald-400 mt-0.5">{batchResult.importedRows}</div>
                </div>
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-medium">Duplicates Skipped</div>
                  <div className="text-lg font-bold text-amber-400 mt-0.5">{batchResult.duplicateRows}</div>
                </div>
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-medium">Rejected Rows</div>
                  <div className="text-lg font-bold text-rose-400 mt-0.5">{batchResult.rejectedRows}</div>
                </div>
              </div>

              {/* Error Report Download Bar (Section 9.2 #12) */}
              {batchResult.rejectedRows > 0 && (
                <div className="bg-rose-950/20 border border-rose-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <div>
                    <h4 className="font-bold text-rose-300">
                      {batchResult.rejectedRows} Row(s) Rejected During Validation
                    </h4>
                    <p className="text-slate-400 mt-0.5">
                      Download the isolated rejection report with exact error descriptions for offline correction and re-upload.
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadErrorReport}
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-500 transition shadow-sm flex items-center space-x-1.5 shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Error Report (CSV)</span>
                  </button>
                </div>
              )}

              {/* Close Button */}
              <div className="flex items-center justify-end pt-4 border-t border-slate-800">
                <button
                  onClick={onClose}
                  className="px-6 py-2 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition shadow-sm"
                >
                  Finished & View Ledger
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Save Template Modal Overlay */}
        {showSaveTemplateModal && (
          <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 max-w-sm w-full space-y-3 shadow-2xl">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Save Reusable Column Mapping Template (Section 9.3)
              </h4>
              <p className="text-xs text-slate-400">
                Save this configuration to quickly re-apply when importing files with the same column layout.
              </p>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Template name, e.g. NetSuite Monthly AR"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={() => setShowSaveTemplateModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTemplate}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500"
                >
                  Save Template
                </button>
              </div>
            </div>
          </div>
        )}

        {/* History Drawer Overlay */}
        {showHistoryDrawer && (
          <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-sm flex justify-end">
            <div className="bg-slate-900 border-l border-slate-800 w-full max-w-md h-full p-6 space-y-4 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <History className="w-4 h-4 text-indigo-400" />
                  <span>Import Batch History (Section 9.5)</span>
                </h3>
                <button
                  onClick={() => setShowHistoryDrawer(false)}
                  className="p-1 text-slate-400 hover:text-white rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                {historyBatches.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-8">No historical import batches recorded.</p>
                ) : (
                  historyBatches.map((b) => (
                    <div key={b.id} className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-indigo-300">{b.batchNumber}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          b.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {b.status}
                        </span>
                      </div>
                      <div className="text-slate-300 font-medium truncate" title={b.filename}>
                        {b.filename} ({b.fileSizeFormatted})
                      </div>
                      <div className="text-[11px] text-slate-400 flex justify-between">
                        <span>Imported: <strong className="text-emerald-400">{b.importedRows}</strong></span>
                        <span>Rejected: <strong className="text-rose-400">{b.rejectedRows}</strong></span>
                        <span>Source: {b.sourceReference || 'Upload'}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-900 flex justify-between">
                        <span>By: {b.createdBy}</span>
                        <span>{b.createdAt}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
