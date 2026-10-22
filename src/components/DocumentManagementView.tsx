import React, { useState, useEffect } from 'react';
import {
  FolderLock,
  FileText,
  FileCheck,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Download,
  Upload,
  Search,
  Filter,
  RefreshCw,
  Clock,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  Eye,
  ExternalLink,
  Ban,
  FileSpreadsheet,
  FileCode,
  HardDrive,
  Database,
  ArrowRight,
  Info,
  Calendar,
  User,
  History,
  X,
  Sparkles
} from 'lucide-react';
import {
  Organization,
  StoredDocument,
  DocumentCategory,
  MalwareScanStatus,
  SignedDownloadUrl,
  DocumentAccessLog,
  DocumentStorageStats
} from '../types';

export interface DocumentManagementViewProps {
  organization: Organization;
  onRefreshData?: () => void;
  onNavigateTab?: (tab: string) => void;
}

const CATEGORY_METADATA: Record<DocumentCategory, { label: string; icon: any; color: string; retention: string; hold: boolean }> = {
  invoice_document: {
    label: 'Invoice Documents',
    icon: FileText,
    color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
    retention: '7 Years (Companies Act & VAT Act)',
    hold: true
  },
  proof_of_payment: {
    label: 'Proofs of Payment',
    icon: FileCheck,
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    retention: '5 Years (Bank & Tax Clearance)',
    hold: false
  },
  credit_note: {
    label: 'Credit Notes',
    icon: FileText,
    color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    retention: '7 Years (Statutory Tax Accounting)',
    hold: true
  },
  dispute_evidence: {
    label: 'Dispute Evidence',
    icon: ShieldAlert,
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    retention: '3 Years (Limitation Act Claims)',
    hold: true
  },
  imported_file: {
    label: 'Imported Files',
    icon: FileSpreadsheet,
    color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    retention: '1 Year (Ingestion Journaling)',
    hold: false
  },
  exported_report: {
    label: 'Exported Reports',
    icon: Database,
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    retention: '3 Years (Audit Snapshot)',
    hold: false
  }
};

export const DocumentManagementView: React.FC<DocumentManagementViewProps> = ({
  organization,
  onRefreshData,
  onNavigateTab
}) => {
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [stats, setStats] = useState<DocumentStorageStats | null>(null);
  const [accessLogs, setAccessLogs] = useState<DocumentAccessLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'vault' | 'access_logs' | 'retention_policies'>('vault');

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Actions
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedDocForSign, setSelectedDocForSign] = useState<StoredDocument | null>(null);
  const [signedUrlData, setSignedUrlData] = useState<SignedDownloadUrl | null>(null);
  const [isSigningUrl, setIsSigningUrl] = useState(false);
  const [signTtl, setSignTtl] = useState(900); // 15 mins default
  const [copiedLink, setCopiedLink] = useState(false);

  // Deletion Modal
  const [docToDelete, setDocToDelete] = useState<StoredDocument | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Malware scan trigger
  const [scanningDocId, setScanningDocId] = useState<string | null>(null);
  const [scanNotice, setScanNotice] = useState<string | null>(null);

  // Upload Form State
  const [uploadCategory, setUploadCategory] = useState<DocumentCategory>('invoice_document');
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadSizeKb, setUploadSizeKb] = useState(350);
  const [uploadEntityRef, setUploadEntityRef] = useState('INV-2026-0901');
  const [uploadDebtorName, setUploadDebtorName] = useState('Apex Industrial Logistics');
  const [uploadDescription, setUploadDescription] = useState('');
  const [simulateMalwareUpload, setSimulateMalwareUpload] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const [docsRes, statsRes, logsRes] = await Promise.all([
        fetch(`/api/documents?orgId=${organization.id}`),
        fetch(`/api/documents/stats?orgId=${organization.id}`),
        fetch(`/api/documents/access-logs?orgId=${organization.id}`)
      ]);

      const docsJson = await docsRes.json();
      const statsJson = await statsRes.json();
      const logsJson = await logsRes.json();

      if (docsJson.success) setDocuments(docsJson.data);
      if (statsJson.success) setStats(statsJson.stats);
      if (logsJson.success) setAccessLogs(logsJson.data);
    } catch (err) {
      console.error('Failed to load documents data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [organization.id]);

  // Generate Signed URL
  const handleGenerateSignedUrl = async (doc: StoredDocument, ttl: number = signTtl) => {
    setIsSigningUrl(true);
    setSignedUrlData(null);
    setSelectedDocForSign(doc);

    try {
      const res = await fetch(`/api/documents/${doc.id}/sign-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ttlSeconds: ttl,
          requestedBy: 'Current User (Finance Controller)',
          userRole: 'credit_controller'
        })
      });
      const data = await res.json();
      if (data.success) {
        setSignedUrlData(data.data);
      } else {
        alert(data.error || 'Failed to generate signed download URL');
      }
    } catch (err: any) {
      alert('Error generating signed URL: ' + err.message);
    } finally {
      setIsSigningUrl(false);
    }
  };

  // Trigger AV Scan
  const handleScanMalware = async (doc: StoredDocument, forceThreat = false) => {
    setScanningDocId(doc.id);
    setScanNotice(null);

    try {
      const res = await fetch(`/api/documents/${doc.id}/scan-malware`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceThreat })
      });
      const data = await res.json();
      if (data.success) {
        setScanNotice(`Scanned "${doc.fileName}": ${data.data.malwareScanStatus.toUpperCase()} - ${data.data.malwareScanDetails}`);
        fetchDocuments();
      }
    } catch (err: any) {
      setScanNotice(`Scan error: ${err.message}`);
    } finally {
      setScanningDocId(null);
      setTimeout(() => setScanNotice(null), 6000);
    }
  };

  // Secure Delete
  const handleExecuteDelete = async () => {
    if (!docToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/documents/${docToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: deleteReason || 'Authorized secure disposal',
          performedBy: 'Eleanor Vance (Compliance Lead)'
        })
      });
      const data = await res.json();
      if (data.success) {
        setDocToDelete(null);
        setDeleteReason('');
        fetchDocuments();
      } else {
        setDeleteError(data.error || 'Deletion rejected by statutory safeguard.');
      }
    } catch (err: any) {
      setDeleteError(err.message || 'Error executing deletion.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Upload Document
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFileName.trim()) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: organization.id,
          fileName: uploadFileName.trim(),
          category: uploadCategory,
          sizeBytes: uploadSizeKb * 1024,
          mimeType: uploadCategory === 'imported_file' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/pdf',
          associatedEntityRef: uploadEntityRef,
          customerDebtorName: uploadDebtorName,
          description: uploadDescription || `Uploaded ${uploadCategory.replace(/_/g, ' ')} for ${uploadDebtorName}`,
          uploadedBy: 'Eleanor Vance (Billing Ops)',
          simulateMalware: simulateMalwareUpload
        })
      });

      const data = await res.json();
      if (data.success) {
        setIsUploadModalOpen(false);
        setUploadFileName('');
        setUploadDescription('');
        setSimulateMalwareUpload(false);
        fetchDocuments();
      } else {
        setUploadError(data.error || 'Upload failed.');
      }
    } catch (err: any) {
      setUploadError(err.message || 'Upload connection failed.');
    } finally {
      setIsUploading(false);
    }
  };

  // Filtered documents
  const filteredDocs = documents.filter((doc) => {
    if (selectedCategory !== 'all' && doc.category !== selectedCategory) return false;
    if (statusFilter !== 'all' && doc.malwareScanStatus !== statusFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      doc.fileName.toLowerCase().includes(q) ||
      (doc.associatedEntityRef && doc.associatedEntityRef.toLowerCase().includes(q)) ||
      (doc.customerDebtorName && doc.customerDebtorName.toLowerCase().includes(q)) ||
      (doc.description && doc.description.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      
      {/* 1. Header & Vault Storage Architecture Overview */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center space-x-1">
                <FolderLock className="w-3.5 h-3.5 mr-1 text-indigo-400" />
                <span>Private Cloud Storage Vault</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Part 28 Architecture</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold flex items-center space-x-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400 mr-1" />
                <span>Private-By-Default Enforced</span>
              </span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              File Storage & Document Management
            </h1>
            <p className="text-xs text-slate-400 max-w-3xl">
              Encrypted cloud object-storage supporting invoice documents, proofs of payment, credit notes, dispute evidence, imported files, and exported reports. Governed by time-limited signed URLs, strict tenant isolation, malware scanning, and statutory retention locks. Zero permanent public URLs.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                fetchDocuments();
                if (onRefreshData) onRefreshData();
              }}
              className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition border border-slate-700"
              title="Refresh Vault Records"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
            </button>

            <button
              onClick={() => {
                setUploadFileName(`Tax_Invoice_${new Date().toISOString().slice(0, 10)}_Consignment.pdf`);
                setIsUploadModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/20 transition flex items-center space-x-1.5 border border-indigo-500/40"
            >
              <Upload className="w-4 h-4 text-indigo-200" />
              <span>Upload Document (28.2)</span>
            </button>
          </div>
        </div>

        {/* Storage Metrics Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>Vault Storage Used</span>
              <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="text-lg font-bold text-white mono-num">
              {stats?.formattedTotalSize || '8.45 MB'}
            </div>
            <div className="text-[10px] text-slate-500">
              Encrypted AES-256-GCM / Cloud Storage
            </div>
          </div>

          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>Total Documents</span>
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="text-lg font-bold text-cyan-400 mono-num">
              {stats?.totalDocuments || documents.length} Objects
            </div>
            <div className="text-[10px] text-slate-500">
              Across 6 Financial AR Domains
            </div>
          </div>

          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>Malware Defense Status</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-lg font-bold text-emerald-400 flex items-center space-x-1">
              <span>{stats?.cleanFilesCount || 9} Verified Clean</span>
            </div>
            <div className="text-[10px] text-slate-500">
              {stats?.quarantinedCount || 1} Threat Quarantined (Zero Breach)
            </div>
          </div>

          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>Statutory Legal Holds</span>
              <Lock className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-lg font-bold text-amber-400 mono-num">
              {stats?.legalHoldCount || 6} Records Locked
            </div>
            <div className="text-[10px] text-slate-500">
              Protected Against Deletion (7y Statute)
            </div>
          </div>
        </div>

        {/* Scan feedback notification */}
        {scanNotice && (
          <div className="p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl text-xs space-y-0.5 text-indigo-300 flex items-start space-x-2">
            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <p className="font-mono text-[11px]">{scanNotice}</p>
          </div>
        )}
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex space-x-2 border-b border-slate-800 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('vault')}
          className={`pb-3 px-3 transition flex items-center space-x-1.5 border-b-2 ${
            activeTab === 'vault'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FolderLock className="w-3.5 h-3.5" />
          <span>Active Storage Vault ({filteredDocs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('access_logs')}
          className={`pb-3 px-3 transition flex items-center space-x-1.5 border-b-2 ${
            activeTab === 'access_logs'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Forensic Access & Download Audit Log ({accessLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('retention_policies')}
          className={`pb-3 px-3 transition flex items-center space-x-1.5 border-b-2 ${
            activeTab === 'retention_policies'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Statutory Retention & Security Policies (28.1)</span>
        </button>
      </div>

      {/* TAB 1: ACTIVE VAULT DOCUMENTS */}
      {activeTab === 'vault' && (
        <div className="space-y-4">
          
          {/* Filters & Search */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="relative md:col-span-2">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by filename, customer, invoice ref, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs"
                />
              </div>

              <div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 text-xs"
                >
                  <option value="all">All Document Categories (6)</option>
                  <option value="invoice_document">Invoice Documents</option>
                  <option value="proof_of_payment">Proofs of Payment</option>
                  <option value="credit_note">Credit Notes</option>
                  <option value="dispute_evidence">Dispute Evidence</option>
                  <option value="imported_file">Imported Files</option>
                  <option value="exported_report">Exported Reports</option>
                </select>
              </div>

              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 text-xs"
                >
                  <option value="all">All AV Statuses</option>
                  <option value="clean">Verified Clean</option>
                  <option value="quarantined">Quarantined Threats</option>
                </select>
              </div>
            </div>

            {/* Quick Category Badges */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-slate-500 font-medium mr-1">Domains:</span>
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                  selectedCategory === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                All ({documents.length})
              </button>
              {(Object.keys(CATEGORY_METADATA) as DocumentCategory[]).map((cat) => {
                const count = documents.filter((d) => d.category === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                      selectedCategory === cat
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                    }`}
                  >
                    {CATEGORY_METADATA[cat].label} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Documents Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold text-[11px]">
                    <th className="py-3.5 px-4">Document / File Name</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Associated Entity</th>
                    <th className="py-3.5 px-4">Size & Encryption</th>
                    <th className="py-3.5 px-4">AV Scan Status</th>
                    <th className="py-3.5 px-4">Retention / Hold</th>
                    <th className="py-3.5 px-4 text-right">Security Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredDocs.map((doc) => {
                    const meta = CATEGORY_METADATA[doc.category] || CATEGORY_METADATA.invoice_document;
                    const IconComponent = meta.icon;
                    const isQuarantined = doc.malwareScanStatus === 'quarantined';

                    return (
                      <tr key={doc.id} className="hover:bg-slate-800/30 transition text-slate-300">
                        {/* Filename & Storage Path */}
                        <td className="py-3 px-4">
                          <div className="flex items-start space-x-2.5">
                            <div className={`p-2 rounded-xl shrink-0 mt-0.5 border ${meta.color}`}>
                              <IconComponent className="w-4 h-4" />
                            </div>
                            <div className="space-y-0.5">
                              <span className="font-semibold text-white block max-w-xs truncate" title={doc.fileName}>
                                {doc.fileName}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono block truncate max-w-xs" title={doc.storagePath}>
                                {doc.storagePath}
                              </span>
                              {doc.description && (
                                <p className="text-[10px] text-slate-400 truncate max-w-xs">
                                  {doc.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${meta.color}`}>
                            {meta.label}
                          </span>
                        </td>

                        {/* Associated Entity */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {doc.associatedEntityRef ? (
                            <div className="space-y-0.5">
                              <span className="font-bold text-white font-mono text-[11px] block">
                                {doc.associatedEntityRef}
                              </span>
                              <span className="text-[10px] text-slate-400 block truncate max-w-[140px]">
                                {doc.customerDebtorName || 'Direct Counterparty'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-500 text-[11px]">System Platform Scope</span>
                          )}
                        </td>

                        {/* Size & Encryption */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="space-y-0.5">
                            <span className="font-mono text-white text-[11px] block">
                              {doc.formattedSize}
                            </span>
                            <span className="text-[10px] text-emerald-400 font-mono block">
                              {doc.encryptionAlgorithm}
                            </span>
                          </div>
                        </td>

                        {/* Malware Scan Status */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {isQuarantined ? (
                            <div className="space-y-0.5">
                              <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold flex items-center space-x-1 w-fit">
                                <Ban className="w-3 h-3 text-rose-400" />
                                <span>Quarantined</span>
                              </span>
                              <span className="text-[9px] text-rose-400/90 block max-w-[150px] truncate" title={doc.malwareScanDetails}>
                                Threat isolated
                              </span>
                            </div>
                          ) : (
                            <div className="space-y-0.5">
                              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center space-x-1 w-fit">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                <span>Clean</span>
                              </span>
                              <span className="text-[10px] text-slate-500 block">
                                {doc.scannedAt?.slice(0, 10)}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Retention & Legal Hold */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="space-y-0.5">
                            {doc.isUnderLegalHold ? (
                              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[10px] font-semibold flex items-center space-x-1 w-fit">
                                <Lock className="w-3 h-3 text-amber-400" />
                                <span>Legal Hold (7y)</span>
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">
                                {doc.retentionYears}y Retention
                              </span>
                            )}
                            <span className="text-[10px] text-slate-500 block">
                              Expires {doc.retentionExpiresAt?.slice(0, 10)}
                            </span>
                          </div>
                        </td>

                        {/* Security Actions */}
                        <td className="py-3 px-4 text-right whitespace-nowrap space-x-1.5">
                          {/* Generate Signed URL Button */}
                          <button
                            onClick={() => handleGenerateSignedUrl(doc, 900)}
                            disabled={isQuarantined || isSigningUrl}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition inline-flex items-center space-x-1 border shadow-sm ${
                              isQuarantined
                                ? 'bg-slate-800 text-slate-600 border-slate-700 cursor-not-allowed'
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500/40'
                            }`}
                            title="Generate 15-minute time-limited signed download link (Zero public URL exposure)"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Signed URL</span>
                          </button>

                          {/* AV Re-Scan Button */}
                          <button
                            onClick={() => handleScanMalware(doc, false)}
                            disabled={scanningDocId === doc.id}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition border border-slate-700"
                            title="Run automated anti-malware verification scan"
                          >
                            <Shield className={`w-3.5 h-3.5 ${scanningDocId === doc.id ? 'animate-spin text-indigo-400' : ''}`} />
                          </button>

                          {/* Secure Delete Button */}
                          <button
                            onClick={() => {
                              setDocToDelete(doc);
                              setDeleteError(null);
                              setDeleteReason('');
                            }}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition border border-rose-500/30"
                            title="Secure cryptographic deletion (Evaluates statutory retention lock)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredDocs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <FolderLock className="w-8 h-8 text-slate-600" />
                          <p className="text-xs">No documents matching the active filter or search criteria.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FORENSIC ACCESS & DOWNLOAD AUDIT LOGS */}
      {activeTab === 'access_logs' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <History className="w-4 h-4 text-indigo-400" />
                <span>Forensic Document Access & Download Audit Ledger</span>
              </h2>
              <p className="text-xs text-slate-400">
                Immutable chronological journal recording every file upload, signed URL token generation, authenticated binary download stream, and deletion attempt.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-300 font-mono text-[10px] border border-indigo-500/20">
              {accessLogs.length} Traceable Events
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold text-[11px]">
                  <th className="py-3 px-3">Timestamp (UTC)</th>
                  <th className="py-3 px-3">Action</th>
                  <th className="py-3 px-3">Target Document</th>
                  <th className="py-3 px-3">User & Role</th>
                  <th className="py-3 px-3">IP Address & Agent</th>
                  <th className="py-3 px-3">Security Outcome</th>
                  <th className="py-3 px-3">Event Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {accessLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 text-slate-300">
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-400">
                      {log.timestamp}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-indigo-300 font-bold text-[10px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-white truncate max-w-xs" title={log.documentName}>
                      {log.documentName}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="text-white block">{log.userName}</span>
                      <span className="text-slate-500 text-[10px]">{log.userRole}</span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-400">
                      {log.ipAddress}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {log.outcome === 'permitted' ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                          PERMITTED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold">
                          {log.outcome.toUpperCase()}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 text-xs font-sans max-w-md truncate" title={log.details}>
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: STATUTORY RETENTION POLICIES */}
      {activeTab === 'retention_policies' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Section 28 Statutory Document Retention & Security Architecture</span>
            </h2>
            <p className="text-xs text-slate-400">
              Preservation mandates enforced by CNTCollect cloud object storage. In accordance with Section 28, all confidential files are private-by-default, validated server-side, and protected by statutory deletion guards.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {(Object.keys(CATEGORY_METADATA) as DocumentCategory[]).map((cat) => {
              const meta = CATEGORY_METADATA[cat];
              const IconComp = meta.icon;

              return (
                <div key={cat} className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2.5 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <div className={`p-2 rounded-xl border ${meta.color}`}>
                        <IconComp className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-white block text-sm">{meta.label}</span>
                        <span className="text-[10px] text-slate-400 font-mono">gs://cntcollect-vault-{organization.id}/{cat}/</span>
                      </div>
                    </div>

                    <div className="space-y-1 pt-1 text-slate-300">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Retention Horizon:</span>
                        <strong className="text-white font-mono">{meta.retention}</strong>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Legal Hold Safeguard:</span>
                        {meta.hold ? (
                          <span className="text-amber-400 font-semibold flex items-center space-x-1">
                            <Lock className="w-3 h-3 mr-1" />
                            <span>Mandatory Hold</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">Discretionary Manager Signoff</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Max Upload Limit:</span>
                        <strong className="text-slate-200 font-mono">
                          {cat === 'imported_file' || cat === 'exported_report' ? '50 MB (Spreadsheets)' : '25 MB (Documents)'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800/80 text-[10px] text-slate-400">
                    <strong className="text-slate-300 block mb-0.5">Policy Rationale:</strong>
                    {cat === 'invoice_document' || cat === 'credit_note'
                      ? 'Statutory VAT compliance requires full retention for 7 years. Automated deletion is strictly blocked while receivables balances or tax years remain open.'
                      : cat === 'proof_of_payment'
                      ? 'Maintained for 5 years to defend against double billing allegations and satisfy SARS / HMRC reconciliation inspections.'
                      : cat === 'dispute_evidence'
                      ? 'Preserved across commercial claim limitation periods to substantiate proof of delivery and temperature telemetry.'
                      : 'Preserved to provide full traceability for automated ingestion and forensic reconciliation.'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          SIGNED URL GENERATION MODAL (Time-Limited Security)
      ========================================================================= */}
      {selectedDocForSign && signedUrlData && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-indigo-500/40 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-auto text-slate-100 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Time-Limited Signed Download URL</h3>
                  <p className="text-[11px] text-slate-400">Cryptographically signed HMAC-SHA256 Token</p>
                </div>
              </div>
              <button onClick={() => setSelectedDocForSign(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1 font-mono text-[11px]">
                <div className="text-slate-400">Document Target:</div>
                <div className="font-bold text-white truncate">{selectedDocForSign.fileName}</div>
                <div className="text-[10px] text-slate-500">
                  SHA-256: {selectedDocForSign.sha256Checksum.slice(0, 24)}...
                </div>
              </div>

              <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-emerald-300 font-semibold text-xs">
                  <span>URL Security Parameters</span>
                  <span className="font-mono text-[10px]">TTL: {signedUrlData.expiresInSeconds}s</span>
                </div>
                <p className="text-[11px] text-emerald-200/90 leading-relaxed">
                  Valid until <strong className="text-white">{signedUrlData.expiresAt}</strong>. After this timestamp, the HMAC token will be rejected by server-side verification.
                </p>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Signed URL Endpoint</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    readOnly
                    value={signedUrlData.url}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-indigo-300 font-mono text-[11px] focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.origin + signedUrlData.url);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold shrink-0 flex items-center space-x-1"
                    title="Copy full signed link to clipboard"
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <a
                  href={signedUrlData.url}
                  download={selectedDocForSign.fileName}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-center flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/30 transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Document via Validated Token</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          UPLOAD MODAL WITH DRAG & DROP / VALIDATION (28.2)
      ========================================================================= */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-indigo-500/30 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-auto text-slate-100 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Upload to Private Cloud Vault</h3>
                  <p className="text-[11px] text-slate-400">Section 28 Validated Document Intake</p>
                </div>
              </div>
              <button onClick={() => setIsUploadModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-3.5">
              {uploadError && (
                <div className="p-3 bg-rose-950/40 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-medium mb-1">Document Category *</label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value as DocumentCategory)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="invoice_document">Invoice Document (7y Statutory Retention)</option>
                  <option value="proof_of_payment">Proof of Payment (5y Clearance Retention)</option>
                  <option value="credit_note">Credit Note (7y Tax Retention)</option>
                  <option value="dispute_evidence">Supporting Dispute Document (3y Claim Horizon)</option>
                  <option value="imported_file">Imported File / Bank Clearance Feed (1y)</option>
                  <option value="exported_report">Exported Report / Audit Snapshot (3y)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">File Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tax_Invoice_INV20260901.pdf"
                  value={uploadFileName}
                  onChange={(e) => setUploadFileName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Associated Invoice / Case Ref</label>
                  <input
                    type="text"
                    placeholder="INV-2026-0901 or DSP-001"
                    value={uploadEntityRef}
                    onChange={(e) => setUploadEntityRef(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Customer / Debtor</label>
                  <input
                    type="text"
                    placeholder="Apex Industrial Logistics"
                    value={uploadDebtorName}
                    onChange={(e) => setUploadDebtorName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Description / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Signed delivery manifest attached to customer dispute claim."
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Security Test: Malware simulation checkbox */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <label className="flex items-start space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={simulateMalwareUpload}
                    onChange={(e) => setSimulateMalwareUpload(e.target.checked)}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-0 mt-0.5 bg-slate-900 border-slate-700"
                  />
                  <div className="space-y-0.5">
                    <span className="font-semibold text-rose-300 block">
                      Simulate Malware EICAR Threat Test
                    </span>
                    <span className="text-slate-400 text-[11px] block">
                      Tests automated AV quarantine pipeline. File will be routed into quarantine bucket and locked from download.
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center space-x-1.5 shadow-lg shadow-indigo-600/30"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isUploading ? 'Uploading & Encrypting...' : 'Upload & Encrypt (AES-256)'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECURE DELETION MODAL WITH STATUTORY HOLD ASSERTION (28.6)
      ========================================================================= */}
      {docToDelete && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/30 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 my-auto text-slate-100 text-xs">
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
              <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
                <Trash2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Secure Document Deletion</h3>
                <p className="text-[11px] text-slate-400">Subject to Statutory Retention Verification</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1 font-mono text-[11px]">
                <span className="text-slate-400">Target Document:</span>
                <div className="font-bold text-white truncate">{docToDelete.fileName}</div>
                <div className="text-[10px] text-slate-500">Category: {docToDelete.category}</div>
              </div>

              {docToDelete.isUnderLegalHold && (
                <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-xl space-y-1 text-amber-300">
                  <div className="font-bold flex items-center space-x-1.5">
                    <Lock className="w-4 h-4 text-amber-400" />
                    <span>Statutory Retention Hold Active</span>
                  </div>
                  <p className="text-[11px] text-amber-200/90 leading-relaxed font-sans">
                    This file is tagged with a mandatory legal hold ({docToDelete.retentionYears} years). Deletion will be rejected by server-side invariant policy.
                  </p>
                </div>
              )}

              {deleteError && (
                <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl space-y-1 text-rose-300">
                  <div className="font-bold flex items-center space-x-1.5">
                    <Ban className="w-4 h-4 text-rose-400" />
                    <span>Deletion Intercepted (HTTP 403)</span>
                  </div>
                  <p className="text-[11px] text-rose-200/90 leading-relaxed font-sans">
                    {deleteError}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-medium mb-1">Reason for Deletion *</label>
                <input
                  type="text"
                  placeholder="e.g. Obsolete draft replaced by certified signed copy"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setDocToDelete(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleExecuteDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white flex items-center space-x-1 shadow-lg shadow-rose-600/30"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeleting ? 'Asserting Policy...' : 'Confirm Deletion'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
