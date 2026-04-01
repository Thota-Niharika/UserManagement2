import React from 'react';
import { X, User as UserIcon, Building2, Mail, Calendar, Phone, ShieldCheck, Tag, Briefcase, MapPin, CheckCircle2, XCircle, Eye, FileText } from 'lucide-react';
<<<<<<< HEAD
<<<<<<< HEAD
import { normalizeEmployee, getFileUrl } from '../../../utils/normalizeEmployee';
import { buildFileUrl } from '../../../utils/file';
=======
import { normalizeEmployee } from '../../../utils/normalizeEmployee';
=======
>>>>>>> 156c736 (commit)
import { buildFileUrl, buildAbsoluteFileUrl } from '../../../utils/file';
>>>>>>> 62ebbba (commit)
import { API_BASE_URL } from '../../../config/api';

const ViewEmployeeModal = ({ isOpen, onClose, employee, onApprove, onRejectDocument }) => {
<<<<<<< HEAD
    React.useEffect(() => {
        if (isOpen && employee) {
            console.log("[DEBUG] ViewEmployeeModal opened with raw employee:", employee);
            const normalized = normalizeEmployee(employee);
            console.log("[DEBUG] ViewEmployeeModal normalized emp:", normalized);
            if (normalized.graduation) {
                console.log("[DEBUG] Graduation Object:", normalized.graduation);
                console.log("[DEBUG] Graduation Certificate:", normalized.graduation.certificatePath);
            } else {
                console.warn("[DEBUG] Graduation object MISSING after normalization");
            }
            console.log("[DEBUG] PAN Number:", normalized.panNumber, "| Aadhar Number:", normalized.aadharNumber);
            console.log("[DEBUG] Identity Proofs Array:", normalized.identityProofs);
            console.log("[DEBUG] File Paths:", {
                photoPath: normalized.photoPath,
                panPath: normalized.panPath,
                aadharPath: normalized.aadharPath,
                passbookPath: normalized.passbookPath,
                photoUrl: normalized.photoPath ? buildFileUrl(normalized.photoPath) : 'NO_PATH',
                panUrl: normalized.panPath ? buildFileUrl(normalized.panPath) : 'NO_PATH',
            });
            if (normalized.identityProofs) {
                normalized.identityProofs.forEach((p, i) => {
                    console.log(`[DEBUG] Proof[${i}]:`, { type: p.type || p.proofType, filePath: p.filePath, url: p.filePath ? buildFileUrl(p.filePath) : 'NO_PATH' });
                });
            }
        }
    }, [isOpen, employee]);

=======
>>>>>>> 156c736 (commit)
    if (!isOpen || !employee) return null;

    // Employee is ALREADY normalized by the API layer — use flat fields directly.
    const emp = employee;

    const handleViewDocument = (url) => {
        if (!url) return;

        // If it's a data URI or blob, open     it directly
        if (url.startsWith('data:') || url.startsWith('blob:')) {
            window.open(url, '_blank');
            return;
        }

        // Use absolute URL to prevent SPA router from intercepting
        // Relative URLs like /api/files/... get caught by React Router in new tabs
        const absoluteUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
        window.open(absoluteUrl, '_blank');
    };

    // hyper-robust: case-insensitive and substring match
    const getProof = (type) => {
        if (!emp?.identityProofs) return null;
        const target = type.toUpperCase();
        return emp.identityProofs.find(p => {
            const pt = ((p.proofType || p.type || '')).toUpperCase();
            if (!pt) return false; // Prevent matching empty types (e.g. 'VOTER'.includes('') is true)
            return pt.includes(target) || target.includes(pt);
        });
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

        // Sanitize: treat NOT_UPLOADED and similar as missing
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
                                const errState = target.dataset.errorState || '0';

                                if (errState === '0') {
                                    target.dataset.errorState = '1';
                                    const currentSrc = target.src || '';
                                    const filename = currentSrc.split(/[/\\]/).pop();

                                    if (currentSrc.includes('/onboarding/files/')) {
                                        target.src = `${API_BASE_URL}/files/${filename}`;
                                    } else {
                                        target.src = `${API_BASE_URL}/onboarding/files/${filename}`;
                                    }
                                } else {
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
                    {['onboarding', 'under_review'].includes(emp.status?.toLowerCase()) && (
                        <button
                            className="doc-reject-btn"
                            title="Reject & Request Re-upload"
                            onClick={() => onRejectDocument(docOrPath, label)}
                        >
                            <X size={14} />
                            Reject
                        </button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content animate-slide-up" onClick={(e) => e.stopPropagation()}>
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
<<<<<<< HEAD
                                            const photoErrState = target.dataset.photoErrState || '0';
=======
                                            if (!target) return;
                                            const photoErrState = target.dataset.photoErrState || '0';

>>>>>>> 62ebbba (commit)
                                            if (photoErrState === '0') {
                                                target.dataset.photoErrState = '1';
                                                const currentSrc = target.src || '';
                                                const filename = currentSrc.split(/[/\\]/).pop();

                                                if (currentSrc.includes('/onboarding/files/')) {
                                                    target.src = `${API_BASE_URL}/files/${filename}`;
                                                } else {
                                                    target.src = `${API_BASE_URL}/onboarding/files/${filename}`;
                                                }
                                            } else {
                                                // Fail gracefully to initials
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
                                <span className="emp-id-tag">ID: {emp.id}</span>
                                {emp.empCode && (
                                    <span className="emp-id-tag" style={{ background: 'rgba(255,255,255,0.2)' }}>Code: {emp.empCode}</span>
                                )}
                            </div>
                        </div>
                    </div>
                    <button className="close-btn-light" onClick={onClose}>
                        <X size={20} />
                    </button>
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
<<<<<<< HEAD
                                        {emp.aadharPath && (
                                            <a href="#" className="view-cert-link" onClick={(e) => { e.preventDefault(); window.open(buildFileUrl(emp.aadharPath), '_blank'); }}>
=======
                                        {emp.aadharPath && emp.aadharPath !== "NOT_UPLOADED" && (
                                            <a href="#" className="view-cert-link" onClick={(e) => { e.preventDefault(); handleViewDocument(buildFileUrl(emp.aadharPath)); }}>
>>>>>>> 62ebbba (commit)
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
                                    <span className="count">{emp.educationCount || 0}</span>
                                    <span className="label">Educations</span>
                                </div>
                                <div className="stat-pill">
                                    <span className="count">{emp.internshipCount || 0}</span>
                                    <span className="label">Internships</span>
                                </div>
                                <div className="stat-pill">
                                    <span className="count">{emp.workExperienceCount || 0}</span>
                                    <span className="label">Exp</span>
                                </div>
                                <div className="stat-pill">
                                    <span className="count">{emp.identityProofCount || 0}</span>
                                    <span className="label">Proofs</span>
                                </div>
                            </div>
                        </div>

                        {/* --- DOCUMENT VIEWER SECTION --- */}
                        <div className="info-section">
                            <h3 className="section-title">Uploaded Documents</h3>
                            <div className="doc-viewer-grid">
                                {renderDocCard(`${emp.bankDocumentType?.replace('_', ' ') || 'Bank Document'}`, { filePath: emp.documentFilePath || emp.passbookPath, entityType: 'BANK_DETAILS', id: emp.id }, "passbook")}
                                {emp.ssc && renderDocCard("SSC Certificate", { ...emp.ssc, filePath: emp.ssc.certificatePath, entityType: 'EDUCATION', id: emp.ssc.id }, "ssc_certificate")}
                                {/* {emp.ssc?.marksMemoPath && renderDocCard("SSC Marks Memo", { ...emp.ssc, filePath: emp.ssc.marksMemoPath, entityType: 'EDUCATION', id: emp.ssc.id }, "ssc_marks")} */}
                                {emp.intermediate && renderDocCard("Inter Certificate", { ...emp.intermediate, filePath: emp.intermediate.certificatePath, entityType: 'EDUCATION', id: emp.intermediate.id }, "inter_certificate")}
                                {/* {emp.intermediate?.marksMemoPath && renderDocCard("Inter Marks Memo", { ...emp.intermediate, filePath: emp.intermediate.marksMemoPath, entityType: 'EDUCATION', id: emp.intermediate.id }, "inter_marks")} */}
                                {emp.graduation && renderDocCard("Grad Certificate", { ...emp.graduation, filePath: emp.graduation.certificatePath, entityType: 'EDUCATION', id: emp.graduation.id }, "grad_certificate")}
                                {emp.graduation?.marksMemoPath && renderDocCard("Grad Marks Memo", { ...emp.graduation, filePath: emp.graduation.marksMemoPath, entityType: 'EDUCATION', id: emp.graduation.id }, "grad_marks")}

                                {/* Identity Proofs — checks identityProofs array (both .type and .proofType) + named proof fields */}
                                {(() => {
                                    const proofType = 'PAN';
                                    const panProof = getProof(proofType) || { filePath: emp.panPath };
                                    if (!panProof.filePath) return null;
                                    return renderDocCard(`PAN Card (${emp.panNumber || '-'})`, panProof, "pan");
                                })()}
                                {(() => {
                                    const aadharProof = getProof('AADHAR') || { filePath: emp.aadharPath };
                                    if (!aadharProof.filePath) return null;
                                    return renderDocCard(`Aadhar Card (${emp.aadharNumber || '-'})`, aadharProof, "aadhar");
                                })()}
                                {(() => {
                                    const photoProof = getProof('PHOTO') || { filePath: emp.photoPath };
                                    if (!photoProof.filePath) return null;
                                    return renderDocCard("Passport Photo", photoProof, "photo");
                                })()}
                                {(() => {
                                    const passportProof = getProof('PASSPORT') || { filePath: emp.passportPath };
                                    if (!passportProof.filePath) return null;
                                    return renderDocCard("Passport Document", passportProof, "passport");
                                })()}
                                {(() => {
                                    const voterProof = getProof('VOTER') || { filePath: emp.voterPath };
                                    if (!voterProof.filePath) return null;
                                    return renderDocCard("Voter ID Card", voterProof, "voter");
                                })()}

                                {/* Render any other identity proofs not already shown */}
                                {(emp.identityProofs || []).map((proof, i) => {
                                    const type = ((proof.type || proof.proofType) || '').toUpperCase();
                                    if (['PAN', 'AADHAR', 'VOTER', 'PHOTO', 'PASSPORT'].includes(type)) return null;
                                    return (
                                        <React.Fragment key={`extra-proof-${i}`}>
                                            {renderDocCard(`${proof.type || proof.proofType || 'Extra Proof'} (${i + 1})`, proof, `extra_proof_${i}`)}
                                        </React.Fragment>
                                    );
                                })}

                                {/* Dynamic Lists */}
                                {emp.postGraduations && emp.postGraduations.map((pg, i) => (
                                    <React.Fragment key={`pg-${i}`}>
                                        {pg.certificatePath && renderDocCard(`Post-Grad Cert (${i + 1})`, { ...pg, filePath: pg.certificatePath, entityType: 'POST_GRADUATION', id: pg.id || i }, `post_grad_file_${i}`)}
                                        {pg.marksMemoPath && renderDocCard(`Post-Grad Marks (${i + 1})`, { ...pg, filePath: pg.marksMemoPath, entityType: 'POST_GRADUATION', id: pg.id || i }, `post_grad_marks_file_${i}`)}
                                    </React.Fragment>
                                ))}
                                {emp.otherCertificates && emp.otherCertificates.map((cert, i) => (
                                    <React.Fragment key={`other-${i}`}>
                                        {renderDocCard(`Cert: ${cert.certificateNumber || 'Record ' + (i + 1)}`, { ...cert, filePath: cert.certificatePath, entityType: 'CERTIFICATION', id: cert.certificateId || cert.id || i }, `otherCertificates[${i}].certificatePath`)}
                                    </React.Fragment>
                                ))}
                                {emp.internships && emp.internships.map((int, i) => (
                                    <React.Fragment key={`int-${i}`}>
                                        {int.offerLetterPath && renderDocCard(`Intern Offer (${int.companyName})`, { ...int, filePath: int.offerLetterPath, entityType: 'INTERNSHIP', id: int.internshipId || int.id || i }, `internship_offer_file_${i}`)}
                                        {int.experienceCertificatePath && renderDocCard(`Intern Cert (${int.companyName})`, { ...int, filePath: int.experienceCertificatePath, entityType: 'INTERNSHIP', id: int.internshipId || int.id || i }, `internship_cert_file_${i}`)}
                                    </React.Fragment>
                                ))}
                                {emp.workExperiences && emp.workExperiences.map((work, i) => (
                                    <React.Fragment key={`exp-${i}`}>
                                        {work.offerLetterPath && renderDocCard(`Work Offer (${work.companyName})`, { ...work, filePath: work.offerLetterPath, entityType: 'WORK_EXPERIENCE', id: work.workExperienceId || work.id || i }, `work_offer_file_${i}`)}
                                        {work.relievingLetterPath && renderDocCard(`Relieving Letter (${work.companyName})`, { ...work, filePath: work.relievingLetterPath, entityType: 'WORK_EXPERIENCE', id: work.workExperienceId || work.id || i }, `work_relieving_file_${i}`)}
                                        {work.payslipsPath && renderDocCard(`Payslips (${work.companyName})`, { ...work, filePath: work.payslipsPath, entityType: 'WORK_EXPERIENCE', id: work.workExperienceId || work.id || i }, `work_payslips_file_${i}`)}
                                        {work.experienceCertificatePath && renderDocCard(`Exp Cert (${work.companyName})`, { ...work, filePath: work.experienceCertificatePath, entityType: 'WORK_EXPERIENCE', id: work.workExperienceId || work.id || i }, `work_exp_cert_file_${i}`)}
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
<<<<<<< HEAD
                                                {/* {emp.ssc.marksMemoPath && (
                                                    <a href="#" className="view-cert-link" onClick={(e) => { e.preventDefault(); window.open(getFileUrl(emp.ssc.marksMemoPath), '_blank'); }}>
=======
                                                {emp.ssc.marksMemoPath && emp.ssc.marksMemoPath !== "NOT_UPLOADED" && (
                                                    <a href="#" className="view-cert-link" onClick={(e) => { e.preventDefault(); handleViewDocument(buildFileUrl(emp.ssc.marksMemoPath)); }}>
>>>>>>> 62ebbba (commit)
                                                        <Eye size={12} /> View Marks Memo
                                                    </a>
                                                )} */}
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
<<<<<<< HEAD
                                                {/* {emp.intermediate.marksMemoPath && (
                                                    <a href="#" className="view-cert-link" onClick={(e) => { e.preventDefault(); window.open(getFileUrl(emp.intermediate.marksMemoPath), '_blank'); }}>
=======
                                                {emp.intermediate.marksMemoPath && emp.intermediate.marksMemoPath !== "NOT_UPLOADED" && (
                                                    <a href="#" className="view-cert-link" onClick={(e) => { e.preventDefault(); handleViewDocument(buildFileUrl(emp.intermediate.marksMemoPath)); }}>
>>>>>>> 62ebbba (commit)
                                                        <Eye size={12} /> View Marks Memo
                                                    </a>
                                                )} */}
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


                <div className="modal-footer-centered" style={{ display: 'flex', gap: '1rem', width: '100%', padding: '1.5rem 2rem' }}>
                    <button className="secondary-btn-wide" onClick={onClose} style={{ flex: 1 }}>Close Profile</button>
                    {['onboarding', 'under_review'].includes(emp.status?.toLowerCase()) && (
                        <div className="action-group-wide">
                            <button
                                className="reject-btn-wide"
                                onClick={() => onApprove(employee, 'REJECTED')}
                            >
                                <XCircle size={18} />
                                Reject Onboard
                            </button>
                            <button
                                className="approve-btn-wide"
                                onClick={() => onApprove(employee, 'APPROVED')}
                            >
                                <CheckCircle2 size={18} />
                                Approve Onboarding
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(15, 23, 42, 0.4);
                    backdrop-filter: blur(8px);
                    display: flex;
                    justify-content: center;
                    z-index: 9999;
                    padding: 2rem 1rem;
                    overflow-y: auto;
                }

                .modal-content {
                    width: 100%;
                    max-width: 550px;
                    background: white;
                    border-radius: 20px;
                    margin: auto;
                    position: relative;
                    overflow: hidden;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                }

                .modal-header-banner {
                    background: var(--primary);
                    background: linear-gradient(135deg, var(--primary) 0%, #1e40af 100%);
                    padding: 2rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    color: white;
                }

                .header-info {
                    display: flex;
                    align-items: center;
                    gap: 1.25rem;
                }

                .profile-badge {
                    width: 64px;
                    height: 64px;
                    background: rgba(255, 255, 255, 0.2);
                    backdrop-filter: blur(4px);
                    border: 2px solid rgba(255, 255, 255, 0.3);
                    border-radius: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.5rem;
                    font-weight: 800;
                    color: white;
                }

                .header-text h2 {
                    font-size: 1.5rem;
                    font-weight: 800;
                    margin-bottom: 0.25rem;
                }

                .emp-id-tag {
                    font-size: 0.875rem;
                    opacity: 0.8;
                    font-family: monospace;
                    background: rgba(255, 255, 255, 0.1);
                    padding: 2px 8px;
                    border-radius: 4px;
                }

                .close-btn-light {
                    background: rgba(255, 255, 255, 0.1);
                    border: none;
                    color: white;
                    padding: 0.5rem;
                    border-radius: 10px;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .close-btn-light:hover {
                    background: rgba(255, 255, 255, 0.2);
                }

                .profile-body {
                    padding: 2rem;
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
                    font-size: 0.875rem;
                }

                .info-tabs {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }

                .info-section {
                    background: #f8fafc;
                    padding: 1.25rem;
                    border-radius: 12px;
                    border: 1px solid var(--divider);
                }

                .section-title {
                    font-size: 0.7rem;
                    font-weight: 800;
                    color: var(--primary);
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    margin-bottom: 1rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .info-row-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 1rem;
                }

                .detail-item-compact {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
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
                    font-size: 0.625rem;
                    color: var(--text-muted);
                    font-weight: 600;
                    margin-bottom: 1px;
                }

                .detail-item-compact span {
                    font-size: 0.8125rem;
                    font-weight: 600;
                    color: var(--text-main);
                }

                .full-width {
                    grid-column: span 2;
                }

                .stats-pills {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.75rem;
                }

                .stat-pill {
                    background: white;
                    border: 1px solid var(--divider);
                    padding: 0.5rem 1rem;
                    border-radius: 10px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    min-width: 80px;
                }

                .stat-pill .count {
                    font-size: 1.125rem;
                    font-weight: 800;
                    color: var(--primary);
                }

                .stat-pill .label {
                    font-size: 0.625rem;
                    font-weight: 700;
                    color: var(--text-muted);
                    text-transform: uppercase;
                }

                .modal-footer-centered {
                    padding: 1.5rem 2rem;
                    background: #f8fafc;
                    display: flex;
                    gap: 1rem;
                    justify-content: center;
                    border-top: 1px solid var(--divider);
                }

                .secondary-btn-wide {
                    background: white;
                    border: 1px solid var(--border-color);
                    color: var(--text-main);
                    padding: 0.75rem 3rem;
                    border-radius: 12px;
                    font-weight: 700;
                    font-size: 0.9rem;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
                }

                .secondary-btn-wide:hover {
                    background: var(--bg-main);
                    border-color: var(--primary);
                    color: var(--primary);
                    transform: translateY(-1px);
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                }

                .secondary-btn-wide:active {
                    transform: translateY(0);
                }

                .submit-btn-wide {
                    background: #10b981;
                    color: white;
                    border: none;
                    padding: 0.75rem 3rem;
                    border-radius: 12px;
                    font-weight: 700;
                    font-size: 0.9rem;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.2);
                }

                .submit-btn-wide:hover {
                    background: #059669;
                    transform: translateY(-1px);
                    box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.3);
                }

                .submit-btn-wide:active {
                    transform: translateY(0);
                }

                .action-group-wide {
                    display: flex;
                    gap: 1rem;
                    width: 100%;
                    max-width: 450px;
                }

                .approve-btn-wide {
                    flex: 1;
                    background: #10b981;
                    color: white;
                    border: none;
                    padding: 0.75rem 1.5rem;
                    border-radius: 12px;
                    font-weight: 700;
                    font-size: 0.9rem;
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
                    padding: 0.75rem 1.5rem;
                    border-radius: 12px;
                    font-weight: 700;
                    font-size: 0.9rem;
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
                    gap: 1rem;
                }

                .doc-card {
                    background: white;
                    border: 1px solid var(--divider);
                    border-radius: 12px;
                    padding: 0.75rem;
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                    transition: all 0.2s;
                    position: relative;
                    overflow: hidden;
                }

                .doc-preview {
                    width: 100%;
                    height: 100px;
                    border-radius: 8px;
                    overflow: hidden;
                    background: #f8fafc;
                    border: 1px solid #f1f5f9;
                }

                .doc-preview img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    background: #fff;
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
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: var(--text-main);
                }

                .doc-status {
                    font-size: 0.625rem;
                    font-weight: 600;
                    color: var(--text-muted);
                }

                .view-cert-link {
                    display: flex;
                    align-items: center;
                    gap: 0.25rem;
                    font-size: 0.75rem;
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
                    padding: 4px 8px;
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
                    padding: 4px 8px;
                    border-radius: 6px;
                    background: #fef2f2;
                    border: 1px solid #fee2e2;
                    color: #ef4444;
                    font-size: 0.65rem;
                    font-weight: 700;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.25rem;
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
                    padding: 0.5rem;
                    color: #cbd5e1;
                }

                .animate-slide-up {
                    animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                }

                @media (max-width: 600px) {
                    .modal-overlay {
                        padding: 0.5rem;
                    }

                    .modal-content {
                        border-radius: 12px;
                    }

                    .modal-header-banner {
                        padding: 1.25rem;
                        flex-direction: column;
                        gap: 1rem;
                    }

                    .header-info {
                        gap: 0.75rem;
                    }

                    .profile-badge {
                        width: 48px;
                        height: 48px;
                        font-size: 1.25rem;
                        border-radius: 12px;
                    }

                    .header-text h2 {
                        font-size: 1.25rem;
                    }

                    .profile-body {
                        padding: 1.25rem;
                    }

                    .info-section {
                        padding: 1rem;
                    }

                    .info-row-grid {
                        grid-template-columns: 1fr;
                        gap: 1.25rem;
                    }

                    .doc-viewer-grid {
                        grid-template-columns: 1fr;
                    }

                    .stats-pills {
                        justify-content: center;
                    }

                    .stat-pill {
                        flex: 1;
                        min-width: 70px;
                        padding: 0.4rem;
                    }

                    .modal-footer-centered {
                        padding: 1.25rem;
                    }

                    .action-group-wide {
                        flex-direction: column-reverse; /* Put Reject below Approve on mobile */
                        max-width: 100%;
                    }

                    .secondary-btn-wide, .approve-btn-wide, .reject-btn-wide {
                        width: 100%;
                        padding: 0.875rem;
                    }

                    .close-btn-light {
                        position: absolute;
                        top: 1.25rem;
                        right: 1.25rem;
                    }
                }

                .full-width {
                    grid-column: span 2;
                }

                @media (max-width: 600px) {
                    .full-width {
                        grid-column: span 1;
                    }
                }

                .detail-cards-grid {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                }

                .detail-card {
                    background: white;
                    border: 1px solid var(--divider);
                    border-radius: 12px;
                    padding: 1rem;
                    position: relative;
                    transition: transform 0.2s;
                }

                .detail-card:hover {
                    border-color: var(--primary);
                    transform: translateX(4px);
                }

                .card-tag {
                    position: absolute;
                    top: -8px;
                    right: 12px;
                    background: var(--primary);
                    color: white;
                    font-size: 0.625rem;
                    font-weight: 800;
                    padding: 2px 8px;
                    border-radius: 4px;
                    text-transform: uppercase;
                }

                .card-content {
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                }

                .card-content strong {
                    font-size: 0.875rem;
                    color: var(--text-main);
                }

                .card-content span {
                    font-size: 0.75rem;
                    color: var(--text-muted);
                }

                .card-footer-mini {
                    margin-top: 0.5rem;
                    padding-top: 0.5rem;
                    border-top: 1px dashed var(--divider);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 0.65rem;
                    color: var(--primary);
                    font-weight: 600;
                }

                .emp-id-tag-mini {
                    font-size: 0.65rem;
                    background: var(--bg-main);
                    padding: 1px 6px;
                    border-radius: 3px;
                    color: var(--primary);
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
                    font-size: 0.65rem;
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
                    font-size: 0.6rem;
                    color: #64748b;
                    font-weight: 700;
                    text-transform: uppercase;
                }
            `}</style>
        </div >
    );
};

export default ViewEmployeeModal;
