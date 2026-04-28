import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, User as UserIcon, Building2, Mail, Calendar, Phone, 
    ShieldCheck, Tag, Briefcase, MapPin, CheckCircle2, XCircle, Eye, FileText, X
} from 'lucide-react';
import apiService from '../../../services/api';
import Toast from '../../common/Toast';
import { buildFileUrl, getAltFileUrl } from '../../../utils/file';
import { API_BASE_URL } from '../../../config/api';

const EmployeeProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [employee, setEmployee] = useState(null);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState({ show: false, message: '', type: 'error' });

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const data = await apiService.getEmployeeDetail(id);
            if (!data) throw new Error("Employee not found");
            setEmployee(data);
        } catch (err) {
            console.error("❌ Failed to load employee profile:", err);
            setToast({ show: true, message: err.message || "Failed to load profile", type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) fetchProfile();
    }, [id]);

    const handleViewDocument = (url) => {
        if (!url) return;
        if (url.startsWith('data:') || url.startsWith('blob:')) {
            window.open(url, '_blank');
            return;
        }
        const absoluteUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
        window.open(absoluteUrl, '_blank');
    };

    const getProof = (type) => {
        if (!employee?.identityProofs) return null;
        const target = type.toUpperCase();
        return employee.identityProofs.find(p => {
            const pt = ((p.proofType || p.type || '')).toUpperCase();
            if (!pt) return false;
            return pt.includes(target) || target.includes(pt);
        });
    };

    const handleRejectDocument = async (doc, label) => {
        if (!window.confirm(`Are you sure you want to reject the "${label}" for ${employee.name}?`)) return;
        const remarks = window.prompt(`Enter rejection reason for "${label}" (optional):`) ?? '';
        try {
            const empId = employee.id || employee.employeeId;
            const entityId = (doc.id && !isNaN(doc.id)) ? Number(doc.id) : null;
            await apiService.rejectOnboardingDocument(empId, doc.entityType, entityId, remarks);
            setToast({ show: true, message: `Document "${label}" rejected.`, type: 'success' });
            fetchProfile(); // refresh
        } catch (error) {
            setToast({ show: true, message: 'Failed to reject document: ' + error.message, type: 'error' });
        }
    };

    const handleApprove = async (emp, status) => {
        try {
            const empId = emp.id || emp.employeeId;
            let remarks = 'All documents verified';
            if (status === 'REJECTED') {
                remarks = window.prompt("Enter overall rejection remarks (sent via email):") || '';
                if (remarks === null) return;
            }
            await apiService.reviewOnboarding({ employeeId: empId, status: status, remarks: remarks });
            setToast({ show: true, message: `Onboarding ${status === 'APPROVED' ? 'approved' : 'rejected'} successfully!`, type: 'success' });
            fetchProfile(); // refresh
        } catch (error) {
            setToast({ show: true, message: 'Failed to process review: ' + error.message, type: 'error' });
        }
    };

    const renderDocCard = (label, docOrPath, fieldKey) => {
        const isStrPath = (v) => typeof v === 'string' && (v.includes('/') || v.includes('\\') || v.includes('.')) && v !== 'NOT_UPLOADED';
        const isValidPath = (v) => v && typeof v === 'string' && v !== 'NOT_UPLOADED' && v !== 'null' && v !== 'undefined' && v.length > 1;

        let path = isStrPath(docOrPath) ? docOrPath : null;
        if (!path && docOrPath && typeof docOrPath === 'object') {
            const raw = docOrPath.filePath || docOrPath.path || docOrPath.certificatePath || docOrPath.url ||
                Object.values(docOrPath).find(isStrPath);
            path = isValidPath(raw) ? raw : null;
        }

        if (!isValidPath(path)) path = null;

        if (!path) {
            return (
                <div className="doc-card doc-missing">
                    <div className="doc-info">
                        <span className="doc-label">{label}</span>
                        <span className="doc-status">Missing</span>
                    </div>
                    <div className="doc-placeholder">
                        <XCircle size={20} />
                    </div>
                </div>
            );
        }

        const lowerPath = (path || "").toLowerCase();
        const isImage = /\.(jpg|jpeg|png|gif|webp|avif|jfif)$/i.test(lowerPath);
        const isPdf = lowerPath.endsWith(".pdf");

        const fileUrl = buildFileUrl(path);

        return (
            <div className="doc-card">
                {isImage ? (
                    <div className="doc-preview">
                        <img
                            src={fileUrl}
                            alt={label}
                            onLoad={(e) => { e.target.parentElement.classList.remove('doc-loading'); }}
                            onError={(e) => {
                                const target = e.target;
                                if (!target) return;
                                
                                // Cycle through alternative URLs for resilient loading
                                const altUrls = getAltFileUrl(target.src);
                                const lastTried = parseInt(target.dataset.triedIndex || '-1');
                                const nextIndex = lastTried + 1;

                                if (altUrls && altUrls[nextIndex]) {
                                    target.dataset.triedIndex = nextIndex;
                                    target.src = altUrls[nextIndex];
                                    console.log(`🖼️ [IMAGE FALLBACK] Trying alternate for "${label}":`, altUrls[nextIndex]);
                                } else {
                                    // Final fallback to placeholder
                                    target.src = '/no-image.png';
                                    target.style.objectFit = 'contain';
                                    target.style.padding = '10px';
                                    const parent = target.parentElement;
                                    if (parent) parent.classList.add('doc-fallback-shown');
                                }
                            }}
                        />
                    </div>
                ) : isPdf ? (
                    <div className="doc-preview doc-pdf-icon">
                        <FileText size={40} color="#ef4444" />
                        <span className="pdf-label">PDF Document</span>
                    </div>
                ) : (
                    <div className="doc-preview doc-generic-icon">
                        <FileText size={40} color="#94a3b8" />
                    </div>
                )}
                <div className="doc-info">
                    <span className="doc-label">{label}</span>
                    <span className="doc-status">Uploaded</span>
                </div>
                <div className="doc-actions">
                    <button
                        className="doc-view-btn"
                        title="View Document"
                        onClick={() => handleViewDocument(fileUrl)}
                    >
                        <Eye size={14} />
                    </button>
                    {['onboarding', 'under_review'].includes(employee?.status?.toLowerCase()) && (
                        <button
                            className="doc-reject-btn"
                            title="Reject & Request Re-upload"
                            onClick={() => handleRejectDocument(docOrPath, label)}
                        >
                            <X size={14} />
                            Reject
                        </button>
                    )}
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#64748b' }}>
                <div style={{ width: 40, height: 40, border: '4px solid #f1f5f9', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <p style={{ marginTop: '1rem', fontWeight: 600 }}>Loading employee profile...</p>
                <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (!employee) {
        return (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
                <ShieldCheck size={48} color="#ef4444" style={{ margin: '0 auto 1rem' }} />
                <h2>Profile Not Found</h2>
                <p>We couldn't retrieve the details for this employee.</p>
                <button onClick={() => navigate('/employees')} className="primary-btn" style={{ marginTop: '1rem' }}>Back to Directory</button>
            </div>
        );
    }

    const emp = employee;

    return (
        <div className="profile-page-wrapper">
            <Toast
                message={toast.show ? toast.message : ''}
                type={toast.type}
                onClose={() => setToast({ ...toast, show: false })}
            />

            <div className="profile-page-header">
                <button onClick={() => navigate('/employees')} className="back-link">
                    <ArrowLeft size={18} />
                    <span>Back to Directory</span>
                </button>
            </div>

            <div className="modal-content animate-slide-up" style={{ margin: '0 auto' }}>
                <div className="modal-header-banner">
                    <div className="header-info">
                        <div className="profile-badge">
                            {emp.photoPath && emp.photoPath !== "NOT_UPLOADED" ? (() => {
                                const photoUrl = buildFileUrl(emp.photoPath);
                                return (
                                    <img
                                        src={photoUrl}
                                        alt={emp.name}
                                        onError={(e) => {
                                            const target = e.target;
                                            
                                            // Handle profile picture fallback
                                            const altUrls = getAltFileUrl(target.src);
                                            const lastTried = parseInt(target.dataset.triedIndex || '-1');
                                            const nextIndex = lastTried + 1;

                                            if (altUrls && altUrls[nextIndex]) {
                                                target.dataset.triedIndex = nextIndex;
                                                target.src = altUrls[nextIndex];
                                            } else {
                                                target.style.display = 'none';
                                                const parent = target.parentElement;
                                                if (parent) {
                                                    parent.innerText = (emp.name || '').split(' ').map(n => n[0]).join('');
                                                    parent.style.display = 'flex';
                                                    parent.style.alignItems = 'center';
                                                    parent.style.justifyContent = 'center';
                                                    parent.style.fontSize = '1.5rem';
                                                    parent.style.background = 'rgba(255,255,255,0.2)';
                                                }
                                            }
                                        }}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                                    />
                                );
                            })() : (
                                (emp.name || '').split(' ').map(n => n[0]).join('')
                            )}
                        </div>
                        <div className="header-text">
                            <h2>{emp.name}</h2>
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                                <span className="emp-id-tag">ID: {emp.id || emp.employeeId}</span>
                                {emp.empCode && (
                                    <span className="emp-id-tag" style={{ background: 'rgba(255,255,255,0.2)' }}>Code: {emp.empCode}</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="profile-body">
                    <div className="status-banner">
                        <span className={`badge-large badge-${(emp.status || 'Active').toLowerCase()}`}>
                            {emp.status || 'Active'}
                        </span>
                        <span className="entity-label">{emp.entityName || '-'}</span>
                    </div>

                    <div className="info-tabs">
                        <div className="info-section">
                            <h3 className="section-title">Professional Details</h3>
                            <div className="info-row-grid">
                                <div className="detail-item-compact">
                                    <Briefcase size={14} />
                                    <div>
                                        <label>Role</label>
                                        <span>{emp.roleName || '-'}</span>
                                    </div>
                                </div>
                                <div className="detail-item-compact">
                                    <Building2 size={14} />
                                    <div>
                                        <label>Department</label>
                                        <span>{emp.deptName || '-'}</span>
                                    </div>
                                </div>
                                <div className="detail-item-compact">
                                    <Building2 size={14} />
                                    <div>
                                        <label>Entity</label>
                                        <span>{emp.entityName || '-'}</span>
                                    </div>
                                </div>
                                <div className="detail-item-compact">
                                    <Calendar size={14} />
                                    <div>
                                        <label>Interview Date</label>
                                        <span>{emp.dateOfInterview || '-'}</span>
                                    </div>
                                </div>
                                <div className="detail-item-compact">
                                    <Calendar size={14} />
                                    <div>
                                        <label>Onboarding Date</label>
                                        <span>{emp.onboardingDate || '-'}</span>
                                    </div>
                                </div>
                                <div className="detail-item-compact">
                                    <Calendar size={14} />
                                    <div>
                                        <label>Created Date</label>
                                        <span>{emp.createdAt?.date || '-'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="info-section">
                            <h3 className="section-title">Personal & Family</h3>
                            <div className="info-row-grid">
                                <div className="detail-item-compact">
                                    <Calendar size={14} />
                                    <div>
                                        <label>Date of Birth</label>
                                        <span>{emp.dateOfBirth || '-'}</span>
                                    </div>
                                </div>
                                <div className="detail-item-compact">
                                    <Tag size={14} />
                                    <div>
                                        <label>Blood Group</label>
                                        <span>{emp.bloodGroup || '-'}</span>
                                    </div>
                                </div>
                                <div className="detail-item-compact">
                                    <UserIcon size={14} />
                                    <div>
                                        <label>Father's Name</label>
                                        <span>{emp.fathersName || '-'} ({emp.fathersPhone || 'N/A'})</span>
                                    </div>
                                </div>
                                <div className="detail-item-compact">
                                    <UserIcon size={14} />
                                    <div>
                                        <label>Mother's Name</label>
                                        <span>{emp.mothersName || '-'} ({emp.mothersPhone || 'N/A'})</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="info-section">
                            <h3 className="section-title">Identity & Proofs</h3>
                            <div className="info-row-grid">
                                <div className="detail-item-compact">
                                    <ShieldCheck size={14} />
                                    <div>
                                        <label>PAN Number</label>
                                        <span className="font-mono text-primary">{emp.panNumber || '-'}</span>
                                        {emp.panPath && emp.panPath !== "NOT_UPLOADED" && (
                                            <a href="#" className="view-cert-link" onClick={(e) => { e.preventDefault(); handleViewDocument(buildFileUrl(emp.panPath)); }}>
                                                <Eye size={12} /> View Proof
                                            </a>
                                        )}
                                    </div>
                                </div>
                                <div className="detail-item-compact">
                                    <ShieldCheck size={14} />
                                    <div>
                                        <label>Aadhar Number</label>
                                        <span className="font-mono text-primary">{emp.aadharNumber || '-'}</span>
                                        {emp.aadharPath && emp.aadharPath !== "NOT_UPLOADED" && (
                                            <a href="#" className="view-cert-link" onClick={(e) => { e.preventDefault(); handleViewDocument(buildFileUrl(emp.aadharPath)); }}>
                                                <Eye size={12} /> View Proof
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="info-section">
                            <h3 className="section-title">Emergency Contact</h3>
                            <div className="info-row-grid">
                                <div className="detail-item-compact">
                                    <ShieldCheck size={14} />
                                    <div>
                                        <label>Contact Person</label>
                                        <span>{emp.emergencyContactName || '-'}</span>
                                    </div>
                                </div>
                                <div className="detail-item-compact">
                                    <Tag size={14} />
                                    <div>
                                        <label>Relationship</label>
                                        <span>{emp.emergencyRelationship || '-'}</span>
                                    </div>
                                </div>
                                <div className="detail-item-compact">
                                    <Phone size={14} />
                                    <div>
                                        <label>Emergency Phone</label>
                                        <span>{emp.emergencyNumber || '-'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="info-section">
                            <h3 className="section-title">Bank Information</h3>
                            <div className="info-row-grid">
                                <div className="detail-item-compact">
                                    <Building2 size={14} />
                                    <div>
                                        <label>Bank Name</label>
                                        <span>{emp.bankName || '-'}</span>
                                    </div>
                                </div>
                                <div className="detail-item-compact">
                                    <MapPin size={14} />
                                    <div>
                                        <label>Branch</label>
                                        <span>{emp.branchName || '-'}</span>
                                    </div>
                                </div>
                                <div className="detail-item-compact">
                                    <Tag size={14} />
                                    <div>
                                        <label>IFSC Code</label>
                                        <span>{emp.ifscCode || '-'}</span>
                                    </div>
                                </div>
                                <div className="detail-item-compact">
                                    <ShieldCheck size={14} />
                                    <div>
                                        <label>Account Number</label>
                                        <span>{emp.accountNumber || '-'}</span>
                                    </div>
                                </div>
                                <div className="detail-item-compact">
                                    <Tag size={14} />
                                    <div>
                                        <label>UPI ID</label>
                                        <span>{emp.upiId || '-'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="info-section">
                            <h3 className="section-title">Contact & Address</h3>
                            <div className="info-row-grid">
                                <div className="detail-item-compact">
                                    <Mail size={14} />
                                    <div>
                                        <label>Email</label>
                                        <span>{emp.email || '-'}</span>
                                    </div>
                                </div>
                                <div className="detail-item-compact">
                                    <Phone size={14} />
                                    <div>
                                        <label>Phone</label>
                                        <span>{emp.phone || '-'}</span>
                                    </div>
                                </div>
                                <div className="detail-item-compact full-width">
                                    <MapPin size={14} />
                                    <div>
                                        <label>Present Address</label>
                                        <span>{emp.presentAddress || '-'}</span>
                                    </div>
                                </div>
                                <div className="detail-item-compact full-width">
                                    <MapPin size={14} />
                                    <div>
                                        <label>Permanent Address</label>
                                        <span>{emp.permanentAddress || '-'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="info-section">
                            <h3 className="section-title">Summary of Records</h3>
                            <div className="stats-pills">
                                <div className="stat-pill">
                                    <span className="count">{emp.educationCount || (emp.ssc || emp.intermediate || emp.graduation ? 1 : 0)}</span>
                                    <span className="label">Educations</span>
                                </div>
                                <div className="stat-pill">
                                    <span className="count">{emp.internshipCount || (emp.internships?.length || 0)}</span>
                                    <span className="label">Internships</span>
                                </div>
                                <div className="stat-pill">
                                    <span className="count">{emp.workExperienceCount || (emp.workExperiences?.length || 0)}</span>
                                    <span className="label">Exp</span>
                                </div>
                                <div className="stat-pill">
                                    <span className="count">{emp.identityProofCount || (emp.identityProofs?.length || 0)}</span>
                                    <span className="label">Proofs</span>
                                </div>
                            </div>
                        </div>

                        {/* --- DOCUMENT VIEWER SECTION --- */}
                        <div className="info-section">
                            <h3 className="section-title">Uploaded Documents</h3>
                            <div className="doc-viewer-grid">
                                {renderDocCard(`${emp.bankDocumentType?.replace('_', ' ') || 'Bank Document'}`, { filePath: emp.passbookPath || emp.documentFilePath, entityType: 'bank', id: emp.id }, "passbook")}
                                {emp.ssc && renderDocCard("SSC Certificate", { ...emp.ssc, filePath: emp.ssc.certificatePath, entityType: 'education', id: emp.ssc.id }, "ssc_certificate")}
                                {emp.intermediate && renderDocCard("Inter Certificate", { ...emp.intermediate, filePath: emp.intermediate.certificatePath, entityType: 'education', id: emp.intermediate.id }, "inter_certificate")}
                                {emp.graduation && renderDocCard("Grad Certificate", { ...emp.graduation, filePath: emp.graduation.certificatePath, entityType: 'education', id: emp.graduation.id }, "grad_certificate")}
                                {emp.graduation?.marksMemoPath && renderDocCard("Grad Marks Memo", { ...emp.graduation, filePath: emp.graduation.marksMemoPath, entityType: 'education', id: emp.graduation.id }, "grad_marks")}

                                {(() => {
                                    const proofType = 'PAN';
                                    const panProof = getProof(proofType) || { filePath: emp.panPath };
                                    if (!panProof.filePath) return null;
                                    return renderDocCard(`PAN Card (${emp.panNumber || '-'})`, { ...panProof, entityType: 'proof' }, "pan");
                                })()}
                                {(() => {
                                    const aadharProof = getProof('AADHAR') || { filePath: emp.aadharPath };
                                    if (!aadharProof.filePath) return null;
                                    return renderDocCard(`Aadhar Card (${emp.aadharNumber || '-'})`, { ...aadharProof, entityType: 'proof' }, "aadhar");
                                })()}
                                {(() => {
                                    const photoProof = getProof('PHOTO') || { filePath: emp.photoPath };
                                    if (!photoProof.filePath) return null;
                                    return renderDocCard("Passport Photo", { ...photoProof, entityType: 'proof' }, "photo");
                                })()}
                                {(() => {
                                    const passportProof = getProof('PASSPORT') || { filePath: emp.passportPath };
                                    if (!passportProof.filePath) return null;
                                    return renderDocCard("Passport Document", { ...passportProof, entityType: 'proof' }, "passport");
                                })()}
                                {(() => {
                                    const voterProof = getProof('VOTER') || { filePath: emp.voterPath };
                                    if (!voterProof.filePath) return null;
                                    return renderDocCard("Voter ID Card", { ...voterProof, entityType: 'proof' }, "voter");
                                })()}

                                {(emp.identityProofs || []).map((proof, i) => {
                                    const type = ((proof.type || proof.proofType) || '').toUpperCase();
                                    if (['PAN', 'AADHAR', 'VOTER', 'PHOTO', 'PASSPORT'].includes(type)) return null;
                                    return (
                                        <React.Fragment key={`extra-proof-${i}`}>
                                            {renderDocCard(`${proof.type || proof.proofType || 'Extra Proof'} (${i + 1})`, { ...proof, entityType: 'proof' }, `extra_proof_${i}`)}
                                        </React.Fragment>
                                    );
                                })}

                                {emp.postGraduations && emp.postGraduations.map((pg, i) => (
                                    <React.Fragment key={`pg-${i}`}>
                                        {pg.certificatePath && renderDocCard(`Post-Grad Cert (${i + 1})`, { ...pg, filePath: pg.certificatePath, entityType: 'education', id: pg.id || i }, `post_grad_file_${i}`)}
                                        {pg.marksMemoPath && renderDocCard(`Post-Grad Marks (${i + 1})`, { ...pg, filePath: pg.marksMemoPath, entityType: 'education', id: pg.id || i }, `post_grad_marks_file_${i}`)}
                                    </React.Fragment>
                                ))}
                                {emp.otherCertificates && emp.otherCertificates.map((cert, i) => (
                                    <React.Fragment key={`other-${i}`}>
                                        {renderDocCard(`Cert: ${cert.certificateNumber || 'Record ' + (i + 1)}`, { ...cert, filePath: cert.certificatePath, entityType: 'certification', id: cert.certificateId || cert.id || i }, `otherCertificates[${i}].certificatePath`)}
                                    </React.Fragment>
                                ))}
                                {emp.internships && emp.internships.map((int, i) => (
                                    <React.Fragment key={`int-${i}`}>
                                        {int.offerLetterPath && renderDocCard(`Intern Offer (${int.companyName})`, { ...int, filePath: int.offerLetterPath, entityType: 'internship', id: int.internshipId || int.id || i }, `internship_offer_file_${i}`)}
                                        {int.experienceCertificatePath && renderDocCard(`Intern Cert (${int.companyName})`, { ...int, filePath: int.experienceCertificatePath, entityType: 'internship', id: int.internshipId || int.id || i }, `internship_cert_file_${i}`)}
                                    </React.Fragment>
                                ))}
                                {emp.workExperiences && emp.workExperiences.map((work, i) => (
                                    <React.Fragment key={`exp-${i}`}>
                                        {work.offerLetterPath && renderDocCard(`Work Offer (${work.companyName})`, { ...work, filePath: work.offerLetterPath, entityType: 'work', id: work.workExperienceId || work.id || i }, `work_offer_file_${i}`)}
                                        {work.relievingLetterPath && renderDocCard(`Relieving Letter (${work.companyName})`, { ...work, filePath: work.relievingLetterPath, entityType: 'work', id: work.workExperienceId || work.id || i }, `work_relieving_file_${i}`)}
                                        {work.payslipsPath && renderDocCard(`Payslips (${work.companyName})`, { ...work, filePath: work.payslipsPath, entityType: 'work', id: work.workExperienceId || work.id || i }, `work_payslips_file_${i}`)}
                                        {work.experienceCertificatePath && renderDocCard(`Exp Cert (${work.companyName})`, { ...work, filePath: work.experienceCertificatePath, entityType: 'work', id: work.workExperienceId || work.id || i }, `work_exp_cert_file_${i}`)}
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>

                        {/* --- NEW DETAILED SECTIONS --- */}
                        {(emp.ssc || emp.intermediate || emp.graduation) && (
                            <div className="info-section">
                                <h3 className="section-title">Education History</h3>
                                <div className="detail-cards-grid">
                                    {emp.ssc && (
                                        <div className="detail-card">
                                            <label className="card-tag">SSC / 10th</label>
                                            <div className="card-content">
                                                <strong>{emp.ssc.institutionName}</strong>
                                                <span>Year: {emp.ssc.passoutYear} | {emp.ssc.percentageCgpa}%</span>
                                                {emp.ssc.hallTicketNo && <span className="text-xs text-muted">ID: {emp.ssc.hallTicketNo}</span>}
                                                {emp.ssc.certificatePath && emp.ssc.certificatePath !== "NOT_UPLOADED" && (
                                                    <a href="#" className="view-cert-link" onClick={(e) => { e.preventDefault(); handleViewDocument(buildFileUrl(emp.ssc.certificatePath)); }}>
                                                        <Eye size={12} /> View Certificate
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    {emp.intermediate && (
                                        <div className="detail-card">
                                            <label className="card-tag">Intermediate / 12th</label>
                                            <div className="card-content">
                                                <strong>{emp.intermediate.institutionName}</strong>
                                                <span>Year: {emp.intermediate.passoutYear} | {emp.intermediate.percentageCgpa}%</span>
                                                {emp.intermediate.hallTicketNo && <span className="text-xs text-muted">ID: {emp.intermediate.hallTicketNo}</span>}
                                                {emp.intermediate.certificatePath && emp.intermediate.certificatePath !== "NOT_UPLOADED" && (
                                                    <a href="#" className="view-cert-link" onClick={(e) => { e.preventDefault(); handleViewDocument(buildFileUrl(emp.intermediate.certificatePath)); }}>
                                                        <Eye size={12} /> View Certificate
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    {emp.graduation && (
                                        <div className="detail-card">
                                            <label className="card-tag">Graduation</label>
                                            <div className="card-content">
                                                <strong>{emp.graduation.institutionName}</strong>
                                                <span>Year: {emp.graduation.passoutYear} | {emp.graduation.percentageCgpa}%</span>
                                                {emp.graduation.hallTicketNo && <span className="text-xs text-muted">ID: {emp.graduation.hallTicketNo}</span>}
                                                {emp.graduation.certificatePath && emp.graduation.certificatePath !== "NOT_UPLOADED" && (
                                                    <a href="#" className="view-cert-link" onClick={(e) => { e.preventDefault(); handleViewDocument(buildFileUrl(emp.graduation.certificatePath)); }}>
                                                        <Eye size={12} /> View Certificate
                                                    </a>
                                                )}
                                                {emp.graduation.marksMemoPath && emp.graduation.marksMemoPath !== "NOT_UPLOADED" && (
                                                    <a href="#" className="view-cert-link" onClick={(e) => { e.preventDefault(); handleViewDocument(buildFileUrl(emp.graduation.marksMemoPath)); }}>
                                                        <Eye size={12} /> View Marks Memo
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    {emp.postGraduations && emp.postGraduations.length > 0 && emp.postGraduations.map((pg, i) => (
                                        <div key={i} className="detail-card">
                                            <label className="card-tag">Post-Grad</label>
                                            <div className="card-content">
                                                <strong>{pg.institutionName}</strong>
                                                <span>Year: {pg.passoutYear} | {pg.percentageCgpa}%</span>
                                                {pg.hallTicketNo && <span className="text-xs text-muted">ID: {pg.hallTicketNo}</span>}
                                                <div className="card-actions-inline">
                                                    {pg.certificatePath && pg.certificatePath !== "NOT_UPLOADED" && (
                                                        <a href="#" className="view-cert-link" onClick={(e) => { e.preventDefault(); handleViewDocument(buildFileUrl(pg.certificatePath)); }}>
                                                            <Eye size={12} /> View Certificate
                                                        </a>
                                                    )}
                                                    {pg.marksMemoPath && pg.marksMemoPath !== "NOT_UPLOADED" && (
                                                        <a href="#" className="view-cert-link" onClick={(e) => { e.preventDefault(); handleViewDocument(buildFileUrl(pg.marksMemoPath)); }}>
                                                            <Eye size={12} /> View Marks Memo
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {emp.otherCertificates && emp.otherCertificates.length > 0 && emp.otherCertificates.map((cert, i) => (
                                        <div key={i} className="detail-card">
                                            <label className="card-tag">Certification</label>
                                            <div className="card-content">
                                                <strong>{cert.instituteName || cert.institute}</strong>
                                                <span>Number: {cert.certificateNumber}</span>
                                                {cert.certificatePath && cert.certificatePath !== "NOT_UPLOADED" && (
                                                    <a href="#" className="view-cert-link" onClick={(e) => { e.preventDefault(); handleViewDocument(buildFileUrl(cert.certificatePath)); }}>
                                                        <Eye size={12} /> View Certificate
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {emp.internships && emp.internships.length > 0 && (
                            <div className="info-section">
                                <h3 className="section-title">Internships</h3>
                                <div className="detail-cards-grid">
                                    {emp.internships.map((int, i) => (
                                        <div key={i} className="detail-card">
                                            <div className="card-content">
                                                <strong>{int.companyName}</strong>
                                                <span className="text-muted">{int.duration} {int.internshipId && `(ID: ${int.internshipId})`}</span>
                                                <div className="card-footer-mini">
                                                    <span>{int.joiningDate} to {int.relievingDate}</span>
                                                </div>
                                                <div className="card-actions-inline">
                                                    {int.offerLetterPath && int.offerLetterPath !== "NOT_UPLOADED" && (
                                                        <a href="#" className="view-cert-link" onClick={(e) => { e.preventDefault(); handleViewDocument(buildFileUrl(int.offerLetterPath)); }}>
                                                            <Eye size={12} /> Offer Letter
                                                        </a>
                                                    )}
                                                    {int.experienceCertificatePath && int.experienceCertificatePath !== "NOT_UPLOADED" && (
                                                        <a href="#" className="view-cert-link" onClick={(e) => { e.preventDefault(); handleViewDocument(buildFileUrl(int.experienceCertificatePath)); }}>
                                                            <Eye size={12} /> Exp Certificate
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {emp.workExperiences && emp.workExperiences.length > 0 && (
                            <div className="info-section">
                                <h3 className="section-title">Work Experience</h3>
                                <div className="detail-cards-grid">
                                    {emp.workExperiences.map((work, i) => (
                                        <div key={i} className="detail-card">
                                            <div className="card-content">
                                                <strong>{work.companyName}</strong>
                                                <span className="text-muted">{work.yearsOfExp}</span>
                                                <div className="card-actions-inline">
                                                    {work.offerLetterPath && work.offerLetterPath !== "NOT_UPLOADED" && (
                                                        <a href="#" className="view-cert-link" onClick={(e) => { e.preventDefault(); handleViewDocument(buildFileUrl(work.offerLetterPath)); }}>
                                                            <Eye size={12} /> Offer
                                                        </a>
                                                    )}
                                                    {work.relievingLetterPath && work.relievingLetterPath !== "NOT_UPLOADED" && (
                                                        <a href="#" className="view-cert-link" onClick={(e) => { e.preventDefault(); handleViewDocument(buildFileUrl(work.relievingLetterPath)); }}>
                                                            <Eye size={12} /> Relieving
                                                        </a>
                                                    )}
                                                    {work.payslipsPath && work.payslipsPath !== "NOT_UPLOADED" && (
                                                        <a href="#" className="view-cert-link" onClick={(e) => { e.preventDefault(); handleViewDocument(buildFileUrl(work.payslipsPath)); }}>
                                                            <Eye size={12} /> Payslips
                                                        </a>
                                                    )}
                                                    {work.experienceCertificatePath && work.experienceCertificatePath !== "NOT_UPLOADED" && (
                                                        <a href="#" className="view-cert-link" onClick={(e) => { e.preventDefault(); handleViewDocument(buildFileUrl(work.experienceCertificatePath)); }}>
                                                            <Eye size={12} /> Exp Cert
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {['onboarding', 'under_review'].includes(emp.status?.toLowerCase()) && (
                    <div className="modal-footer-centered" style={{ display: 'flex', gap: '1rem', width: '100%', padding: '1.5rem 2rem' }}>
                        <div className="action-group-wide" style={{ width: '100%', maxWidth: 'none', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <button
                                className="reject-btn-wide"
                                style={{ maxWidth: '300px' }}
                                onClick={() => handleApprove(employee, 'REJECTED')}
                            >
                                <XCircle size={18} />
                                Reject Onboard
                            </button>
                            <button
                                className="approve-btn-wide"
                                style={{ maxWidth: '300px' }}
                                onClick={() => handleApprove(employee, 'APPROVED')}
                            >
                                <CheckCircle2 size={18} />
                                Approve Onboarding
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                .profile-page-wrapper {
                    padding: 2rem;
                    max-width: 1200px;
                    margin: 0 auto;
                }

                .profile-page-header {
                    margin-bottom: 2rem;
                }

                .back-link {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    background: none;
                    border: none;
                    color: #64748b;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .back-link:hover {
                    color: var(--primary);
                    transform: translateX(-4px);
                }

                .modal-content {
                    width: 100%;
                    max-width: 800px;
                    background: white;
                    border-radius: 20px;
                    position: relative;
                    overflow: hidden;
                    box-shadow: 0 10px 25px -12px rgba(0, 0, 0, 0.15);
                    border: 1px solid var(--divider);
                }

                .modal-header-banner {
                    background: var(--primary);
                    background: linear-gradient(135deg, var(--primary) 0%, #1e40af 100%);
                    padding: 2.5rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    color: white;
                }

                .header-info {
                    display: flex;
                    align-items: center;
                    gap: 1.5rem;
                }

                .profile-badge {
                    width: 80px;
                    height: 80px;
                    background: rgba(255, 255, 255, 0.2);
                    backdrop-filter: blur(4px);
                    border: 3px solid rgba(255, 255, 255, 0.3);
                    border-radius: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 2rem;
                    font-weight: 800;
                    color: white;
                }

                .header-text h2 {
                    font-size: 2rem;
                    font-weight: 800;
                    margin-bottom: 0.25rem;
                }

                .emp-id-tag {
                    font-size: 0.875rem;
                    opacity: 0.8;
                    font-family: monospace;
                    background: rgba(255, 255, 255, 0.1);
                    padding: 4px 10px;
                    border-radius: 6px;
                }

                .profile-body {
                    padding: 2.5rem;
                }

                .status-banner {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 2rem;
                    padding-bottom: 1.5rem;
                    border-bottom: 1px solid var(--divider);
                }

                .badge-large {
                    padding: 6px 14px;
                    border-radius: 20px;
                    font-size: 0.875rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .entity-label {
                    font-weight: 600;
                    color: var(--text-muted);
                    font-size: 1rem;
                }

                .info-tabs {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }

                .info-section {
                    background: #f8fafc;
                    padding: 1.5rem;
                    border-radius: 12px;
                    border: 1px solid var(--divider);
                }

                .section-title {
                    font-size: 0.75rem;
                    font-weight: 800;
                    color: var(--primary);
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    margin-bottom: 1.25rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .info-row-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 1.25rem;
                }

                .detail-item-compact {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                .detail-item-compact svg {
                    color: #64748b;
                    flex-shrink: 0;
                }

                .detail-item-compact div {
                    display: flex;
                    flex-direction: column;
                }

                .detail-item-compact label {
                    font-size: 0.7rem;
                    color: var(--text-muted);
                    font-weight: 700;
                    margin-bottom: 2px;
                    text-transform: uppercase;
                }

                .detail-item-compact span {
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: var(--text-main);
                }

                .full-width {
                    grid-column: span 2;
                }

                .stats-pills {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 1rem;
                }

                .stat-pill {
                    background: white;
                    border: 1px solid var(--divider);
                    padding: 0.75rem 1.25rem;
                    border-radius: 12px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    min-width: 90px;
                }

                .stat-pill .count {
                    font-size: 1.5rem;
                    font-weight: 800;
                    color: var(--primary);
                }

                .stat-pill .label {
                    font-size: 0.7rem;
                    font-weight: 700;
                    color: var(--text-muted);
                    text-transform: uppercase;
                }

                .modal-footer-centered {
                    padding: 1.5rem 2.5rem;
                    background: #f8fafc;
                    display: flex;
                    gap: 1rem;
                    justify-content: center;
                    border-top: 1px solid var(--divider);
                }

                .approve-btn-wide {
                    flex: 1;
                    background: #10b981;
                    color: white;
                    border: none;
                    padding: 0.875rem 1.5rem;
                    border-radius: 12px;
                    font-weight: 700;
                    font-size: 0.95rem;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    transition: all 0.2s;
                    box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.2);
                }

                .approve-btn-wide:hover {
                    background: #059669;
                    transform: translateY(-1px);
                    box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.3);
                }

                .reject-btn-wide {
                    flex: 1;
                    background: white;
                    border: 1px solid #ef4444;
                    color: #ef4444;
                    padding: 0.875rem 1.5rem;
                    border-radius: 12px;
                    font-weight: 700;
                    font-size: 0.95rem;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    transition: all 0.2s;
                }

                .reject-btn-wide:hover {
                    background: #fef2f2;
                    transform: translateY(-1px);
                }

                .doc-viewer-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 1.25rem;
                }

                .doc-card {
                    background: white;
                    border: 1px solid var(--divider);
                    border-radius: 12px;
                    padding: 1rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    transition: all 0.2s;
                }

                .doc-preview {
                    width: 100%;
                    height: 120px;
                    border-radius: 8px;
                    overflow: hidden;
                    background: #f8fafc;
                    border: 1px solid #f1f5f9;
                }

                .doc-preview img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .doc-card:hover {
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
                    border-color: var(--primary);
                }

                .doc-missing {
                    background: #fef2f2;
                    border-color: #fee2e2;
                    opacity: 0.8;
                }

                .doc-info {
                    display: flex;
                    flex-direction: column;
                }

                .doc-label {
                    font-size: 0.875rem;
                    font-weight: 700;
                    color: var(--text-main);
                }

                .doc-status {
                    font-size: 0.7rem;
                    font-weight: 600;
                    color: var(--text-muted);
                }

                .view-cert-link {
                    display: flex;
                    align-items: center;
                    gap: 0.25rem;
                    font-size: 0.8rem;
                    color: var(--primary);
                    margin-top: 0.5rem;
                    text-decoration: none;
                    font-weight: 600;
                }
                
                .view-cert-link:hover {
                    text-decoration: underline;
                }

                .card-actions-inline {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.75rem;
                    margin-top: 0.5rem;
                }

                .doc-actions {
                    display: flex;
                    gap: 0.5rem;
                }

                .doc-view-btn {
                    padding: 6px 10px;
                    border-radius: 6px;
                    background: var(--bg-main);
                    border: 1px solid var(--divider);
                    color: var(--primary);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .doc-view-btn:hover {
                    background: white;
                    border-color: var(--primary);
                }

                .doc-reject-btn {
                    flex: 1;
                    padding: 6px 10px;
                    border-radius: 6px;
                    background: #fef2f2;
                    border: 1px solid #fee2e2;
                    color: #ef4444;
                    font-size: 0.7rem;
                    font-weight: 700;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.35rem;
                    transition: all 0.2s;
                }

                .doc-reject-btn:hover {
                    background: #ef4444;
                    color: white;
                }

                .doc-placeholder {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 1rem;
                    color: #cbd5e1;
                }

                .animate-slide-up {
                    animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                }

                @media (max-width: 768px) {
                    .info-row-grid, .doc-viewer-grid {
                        grid-template-columns: 1fr;
                    }
                    .full-width {
                        grid-column: span 1;
                    }
                    .modal-header-banner {
                        flex-direction: column;
                    }
                    .profile-page-wrapper {
                        padding: 1rem;
                    }
                    .profile-body {
                        padding: 1.5rem;
                    }
                }

                .detail-cards-grid {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }

                .detail-card {
                    background: white;
                    border: 1px solid var(--divider);
                    border-radius: 12px;
                    padding: 1.25rem;
                    position: relative;
                    transition: transform 0.2s;
                }

                .detail-card:hover {
                    border-color: var(--primary);
                    transform: translateX(4px);
                }

                .card-tag {
                    position: absolute;
                    top: -10px;
                    right: 16px;
                    background: var(--primary);
                    color: white;
                    font-size: 0.7rem;
                    font-weight: 800;
                    padding: 4px 10px;
                    border-radius: 6px;
                    text-transform: uppercase;
                }

                .card-content {
                    display: flex;
                    flex-direction: column;
                    gap: 0.35rem;
                }

                .card-content strong {
                    font-size: 1rem;
                    color: var(--text-main);
                }

                .card-content span {
                    font-size: 0.85rem;
                    color: var(--text-muted);
                }

                .card-footer-mini {
                    margin-top: 0.75rem;
                    padding-top: 0.75rem;
                    border-top: 1px dashed var(--divider);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 0.75rem;
                    color: var(--primary);
                    font-weight: 600;
                }

                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }

                .doc-pdf-icon, .doc-generic-icon {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    background: #f8fafc;
                    gap: 0.5rem;
                }

                .pdf-label {
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: #ef4444;
                    text-transform: uppercase;
                }

                .doc-preview.doc-load-failed {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    background: #f1f5f9;
                    position: relative;
                    gap: 0.5rem;
                }

                .doc-preview.doc-load-failed::before {
                    content: '⚠';
                    font-size: 1.5rem;
                    color: #94a3b8;
                }

                .doc-preview.doc-load-failed::after {
                    content: 'Preview Unavailable';
                    font-size: 0.7rem;
                    color: #64748b;
                    font-weight: 700;
                    text-transform: uppercase;
                }
            `}</style>
        </div>
    );
};

export default EmployeeProfile;
