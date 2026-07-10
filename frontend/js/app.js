/**
 * Certificate System - DApp
 * Professional Certificate Verification System
 */

'use strict';

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
    systemAddress: '0x94fb6fcD345d639520468E58455bA9C6698877A7',
    nftAddress: '0x37cA1379B1dD7af5862CaAA1873Ce0aF3E037D99',
    ipfsGateway: 'https://ipfs.io/ipfs/',
};

// ============================================
// CONTRACT ABIs
// ============================================
const SYSTEM_ABI = [
    'function isLecturer(address) view returns (bool)',
    'function isStudent(address) view returns (bool)',
    'function registerStudent(address)',
    'function issueCertificate(address,string,string,string,string) returns (uint256)',
    'function verifyCertificate(uint256)',
    'function revokeCertificate(uint256)',
    'function getCertificate(uint256) view returns (string,string,string,uint256,string,bool,address)',
    'function getTotalCertificates() view returns (uint256)',
    'function getStudentCertificates(address) view returns (uint256[])',
    'function addLecturer(address)',
    'function removeLecturer(address)',
    'function nftContract() view returns (address)',
    'function admin() view returns (address)',
];

const NFT_ABI = [
    'function ownerOf(uint256) view returns (address)',
    'function tokenURI(uint256) view returns (string)',
    'function getCertificate(uint256) view returns (string,string,string,uint256,string,bool,address)',
    'function getStudentCertificates(address) view returns (uint256[])',
    'function tokenCounter() view returns (uint256)',
    'function verifyCertificate(uint256)',
];

// ============================================
// STATE
// ============================================
let systemContract = null;
let nftContract = null;
let provider = null;
let signer = null;
let currentAccount = null;
let isConnected = false;
let currentPage = 'home';
let isTransitioning = false;

// ============================================
// DOM REFERENCES
// ============================================
const connectBtn = document.getElementById('connectBtn');
const networkBadge = document.getElementById('networkBadge');

// ============================================
// PAGE MANAGEMENT
// ============================================
const pageElements = {
    home: document.getElementById('homePage'),
    issue: document.getElementById('issuePage'),
    verify: document.getElementById('verifyPage'),
    dashboard: document.getElementById('dashboardPage')
};

const navLinks = document.querySelectorAll('.nav-links a');

function showPage(page) {
    if (isTransitioning || currentPage === page) return;
    isTransitioning = true;

    Object.keys(pageElements).forEach(key => {
        const el = pageElements[key];
        if (el) {
            el.style.display = 'none';
            el.classList.remove('active');
        }
    });

    const targetEl = pageElements[page];
    if (targetEl) {
        targetEl.style.display = 'block';
        targetEl.classList.add('active');
    }

    navLinks.forEach(a => a.classList.remove('active'));
    const activeLink = document.querySelector(`.nav-links a[data-page="${page}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }

    currentPage = page;
    
    setTimeout(() => {
        isTransitioning = false;
    }, 100);
}

// ============================================
// NAVIGATION EVENT LISTENERS
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    const logoLink = document.getElementById('logoLink');
    if (logoLink) {
        logoLink.addEventListener('click', function(e) {
            e.preventDefault();
            showPage('home');
        });
    }
    
    const navContainer = document.querySelector('.nav-links');
    if (navContainer) {
        navContainer.addEventListener('click', function(e) {
            const link = e.target.closest('a');
            if (!link) return;
            
            const page = link.dataset.page;
            if (page) {
                e.preventDefault();
                e.stopPropagation();
                showPage(page);
            }
        });
    }
    
    showPage('home');
});

// ============================================
// CONNECTION
// ============================================
async function connectWallet() {
    if (typeof window.ethereum === 'undefined') {
        alert('Please install MetaMask!');
        return;
    }

    try {
        connectBtn.disabled = true;
        connectBtn.textContent = 'Connecting...';

        const accounts = await window.ethereum.request({
            method: 'eth_requestAccounts'
        });

        currentAccount = accounts[0];
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();

        const network = await provider.getNetwork();
        if (network.chainId !== 11155111) {
            alert('Please switch to Sepolia network!');
            connectBtn.disabled = false;
            connectBtn.textContent = 'Connect Wallet';
            return;
        }

        systemContract = new ethers.Contract(CONFIG.systemAddress, SYSTEM_ABI, signer);
        nftContract = new ethers.Contract(CONFIG.nftAddress, NFT_ABI, signer);

        isConnected = true;
        connectBtn.textContent = 'Connected';
        connectBtn.className = 'btn btn-success';

        networkBadge.textContent = '● Sepolia';
        networkBadge.className = 'network-badge online';

        await updateDashboard();
        await updateHomeStats();
        await checkRole();

        console.log('Connected:', currentAccount);

    } catch (error) {
        console.error(error);
        connectBtn.textContent = 'Connect Wallet';
        connectBtn.className = 'btn btn-primary';
        alert('Connection failed: ' + error.message);
    }
}

// ============================================
// CHECK ROLE
// ============================================
async function checkRole() {
    if (!isConnected) return;

    try {
        const isLecturer = await systemContract.isLecturer(currentAccount);
        const isStudent = await systemContract.isStudent(currentAccount);

        let role = 'User';
        if (isLecturer) role = 'Lecturer';
        else if (isStudent) role = 'Student';

        document.getElementById('userRole').textContent = 'Role: ' + role;

    } catch (error) {
        console.error('Role check error:', error);
    }
}

// ============================================
// UPDATE DASHBOARD
// ============================================
async function updateDashboard() {
    if (!isConnected) return;

    try {
        const total = await systemContract.getTotalCertificates();
        document.getElementById('totalCertificates').textContent = total.toString();

        const studentCerts = await systemContract.getStudentCertificates(currentAccount);
        document.getElementById('myCertificates').textContent = studentCerts.length;

        const listDiv = document.getElementById('certificateList');
        if (studentCerts.length === 0) {
            listDiv.innerHTML = '<p class="empty-state">No certificates found</p>';
        } else {
            let html = '<h4 style="margin-bottom:12px;font-weight:600;">Your Certificates</h4>';
            for (const id of studentCerts) {
                const cert = await systemContract.getCertificate(id);
                html += `
                    <div class="certificate-card" style="margin-top:8px;">
                        <div class="cert-field">
                            <span class="label">Certificate #${id}</span>
                            <span class="value">${cert[0]}</span>
                        </div>
                        <div class="cert-field">
                            <span class="label">Course</span>
                            <span class="value">${cert[1]}</span>
                        </div>
                        <div class="cert-field">
                            <span class="label">Grade</span>
                            <span class="value">${cert[2]}</span>
                        </div>
                    </div>
                `;
            }
            listDiv.innerHTML = html;
        }

    } catch (error) {
        console.error('Dashboard error:', error);
    }
}

// ============================================
// UPDATE HOME STATS
// ============================================
async function updateHomeStats() {
    if (!isConnected) return;

    try {
        const total = await systemContract.getTotalCertificates();
        document.getElementById('totalCertsHome').textContent = total.toString();

        document.getElementById('totalStudentsHome').textContent = '1';
        document.getElementById('totalLecturersHome').textContent = '1';

    } catch (error) {
        console.error('Home stats error:', error);
    }
}

// ============================================
// ISSUE CERTIFICATE
// ============================================
async function issueCertificate() {
    if (!isConnected) {
        showStatus('issueStatus', 'Please connect wallet first', 'error');
        return;
    }

    const student = document.getElementById('studentAddress').value.trim();
    const studentName = document.getElementById('studentName').value.trim();
    const course = document.getElementById('courseName').value.trim();
    const grade = document.getElementById('grade').value;
    const ipfsHash = document.getElementById('ipfsHash').value.trim();

    if (!student || !studentName || !course) {
        showStatus('issueStatus', 'Please fill all required fields', 'error');
        return;
    }

    if (!student.match(/^0x[a-fA-F0-9]{40}$/)) {
        showStatus('issueStatus', 'Invalid Ethereum address', 'error');
        return;
    }

    try {
        showStatus('issueStatus', 'Issuing certificate...', 'pending');

        const tx = await systemContract.issueCertificate(
            student, studentName, course, grade, ipfsHash
        );

        showStatus('issueStatus', 'Transaction sent. Waiting for confirmation...', 'pending');

        await tx.wait();

        showStatus('issueStatus', 'Certificate issued successfully!', 'success');

        document.getElementById('studentAddress').value = '';
        document.getElementById('studentName').value = '';
        document.getElementById('courseName').value = '';

        await updateDashboard();
        await updateHomeStats();

    } catch (error) {
        console.error(error);
        if (error.message.includes('Student is not registered')) {
            showStatus('issueStatus', 'Student not registered. Please register the student first.', 'error');
        } else if (error.message.includes('Only lecturer')) {
            showStatus('issueStatus', 'Only lecturers can issue certificates.', 'error');
        } else {
            showStatus('issueStatus', 'Error: ' + error.message, 'error');
        }
    }
}

// ============================================
// VERIFY CERTIFICATE
// ============================================
async function verifyCertificate() {
    const tokenId = document.getElementById('certificateId').value.trim();

    if (!tokenId) {
        showStatus('verifyStatus', 'Please enter a Certificate ID', 'error');
        return;
    }

    try {
        showStatus('verifyStatus', 'Verifying certificate...', 'pending');

        const cert = await systemContract.getCertificate(tokenId);
        const resultDiv = document.getElementById('certificateResult');
        resultDiv.style.display = 'block';

        document.getElementById('resultId').textContent = tokenId;
        document.getElementById('resultStudent').textContent = cert[0] || 'N/A';
        document.getElementById('resultCourse').textContent = cert[1] || 'N/A';
        document.getElementById('resultGrade').textContent = cert[2] || 'N/A';
        document.getElementById('resultDate').textContent = cert[3] ? new Date(cert[3] * 1000).toLocaleDateString() : 'N/A';

        const ipfsHash = cert[4] || '';
        document.getElementById('resultIpfs').textContent = ipfsHash || 'N/A';

        const statusSpan = document.getElementById('resultStatus');
        if (cert[5]) {
            statusSpan.innerHTML = '<span class="badge badge-valid">Valid</span>';
        } else {
            statusSpan.innerHTML = '<span class="badge badge-revoked">Revoked</span>';
        }

        document.getElementById('resultOwner').textContent = cert[6] || 'N/A';

        // Display IPFS image - FIXED
        if (ipfsHash && ipfsHash !== '') {
            displayIPFSImage(ipfsHash);
        } else {
            const imageDisplay = document.getElementById('certificateImageDisplay');
            if (imageDisplay) {
                imageDisplay.innerHTML = '<div class="no-image">No certificate image available on IPFS.</div>';
            }
        }

        showStatus('verifyStatus', 'Certificate verified successfully!', 'success');

    } catch (error) {
        console.error(error);
        document.getElementById('certificateResult').style.display = 'none';
        if (error.message.includes('Certificate does not exist')) {
            showStatus('verifyStatus', 'Certificate not found. Please check the ID.', 'error');
        } else {
            showStatus('verifyStatus', 'Error: ' + error.message, 'error');
        }
    }
}

// ============================================
// DISPLAY IPFS IMAGE - FULLY FIXED
// ============================================
function displayIPFSImage(ipfsHash) {
    const container = document.getElementById('certificateImageDisplay');
    if (!container) return;

    if (!ipfsHash || ipfsHash === '') {
        container.innerHTML = '<div class="no-image">No certificate image available.</div>';
        return;
    }

    // ✅ Use multiple gateways - starting with the most reliable
    const gateways = [
        `https://ipfs.io/ipfs/${ipfsHash}`,
        `https://cloudflare-ipfs.com/ipfs/${ipfsHash}`,
        `https://dweb.link/ipfs/${ipfsHash}`,
        `https://nftstorage.link/ipfs/${ipfsHash}`,
        `https://w3s.link/ipfs/${ipfsHash}`,
        `https://gateway.pinata.cloud/ipfs/${ipfsHash}`
    ];

    // Show loading state
    container.innerHTML = `
        <div class="loading-image">
            <div class="spinner"></div>
            <span>Loading certificate image...</span>
        </div>
    `;

    let currentIndex = 0;
    let imageLoaded = false;

    function tryNextGateway() {
        if (imageLoaded) return;
        
        if (currentIndex >= gateways.length) {
            // All gateways failed
            container.innerHTML = `
                <div style="text-align:center;padding:20px;background:rgba(255,255,255,0.02);border-radius:8px;border:1px dashed var(--border-color);">
                    <p style="color:var(--text-secondary);margin-bottom:12px;">Certificate image could not be loaded</p>
                    <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;">
                        <a href="https://ipfs.io/ipfs/${ipfsHash}" target="_blank" style="color:var(--accent-blue);text-decoration:none;padding:8px 24px;border:1px solid var(--accent-blue);border-radius:6px;display:inline-block;">
                            📄 View Certificate on IPFS
                        </a>
                    </div>
                    <div style="margin-top:10px;font-size:12px;color:var(--text-muted);word-break:break-all;background:rgba(0,0,0,0.2);padding:8px 12px;border-radius:4px;">
                        IPFS Hash: ${ipfsHash}
                    </div>
                </div>
            `;
            return;
        }

        const imageUrl = gateways[currentIndex];
        console.log(`Trying gateway ${currentIndex + 1}/${gateways.length}:`, imageUrl);
        
        // Create a new image element
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        let timeoutId = setTimeout(() => {
            // Timeout - try next gateway
            img.src = ''; // Cancel loading
            currentIndex++;
            tryNextGateway();
        }, 8000);
        
        img.onload = function() {
            clearTimeout(timeoutId);
            if (imageLoaded) return;
            imageLoaded = true;
            
            // Success - display the image
            container.innerHTML = `
                <div style="text-align:center;">
                    <img src="${imageUrl}" alt="Certificate Document" style="width:100%;max-width:600px;max-height:400px;object-fit:contain;border-radius:8px;border:1px solid var(--border-color);display:block;margin:0 auto;" />
                    <div style="margin-top:12px;display:flex;justify-content:center;gap:12px;flex-wrap:wrap;font-size:13px;">
                        <a href="${imageUrl}" target="_blank" style="color:var(--accent-blue);text-decoration:none;padding:6px 18px;border:1px solid var(--border-color);border-radius:6px;">
                            🔍 View Full Size
                        </a>
                        <a href="https://ipfs.io/ipfs/${ipfsHash}" target="_blank" style="color:var(--text-secondary);text-decoration:none;padding:6px 18px;border:1px solid var(--border-color);border-radius:6px;">
                            📄 Open on IPFS
                        </a>
                    </div>
                    <div style="margin-top:8px;font-size:11px;color:var(--text-muted);word-break:break-all;background:rgba(0,0,0,0.2);padding:6px 12px;border-radius:4px;">
                        IPFS: ${ipfsHash}
                    </div>
                </div>
            `;
        };
        
        img.onerror = function() {
            clearTimeout(timeoutId);
            // Try next gateway
            currentIndex++;
            tryNextGateway();
        };
        
        img.src = imageUrl;
    }

    // Start trying gateways
    tryNextGateway();
}

// ============================================
// IPFS UPLOAD
// ============================================
async function uploadToIPFS() {
    alert('Upload your file to Pinata or Web3.storage, then copy the CID here.');
    document.getElementById('ipfsHash').focus();
}

// ============================================
// QR SCANNER
// ============================================
let qrScanner = null;
let isScanning = false;
let codeReader = null;

async function startQRScanner() {
    if (isScanning) {
        stopQRScanner();
        return;
    }

    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert('Camera access is not supported in this browser. Please use Chrome, Edge, or Firefox.');
            return;
        }

        const previewElem = document.getElementById('qr-reader');
        previewElem.innerHTML = '';
        previewElem.style.display = 'block';

        showStatus('verifyStatus', 'Starting camera...', 'pending');

        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
        });

        const video = document.createElement('video');
        video.srcObject = stream;
        video.setAttribute('playsinline', true);
        video.style.width = '100%';
        video.style.maxWidth = '300px';
        video.style.borderRadius = '8px';
        previewElem.appendChild(video);

        codeReader = new ZXing.BrowserQRCodeReader();
        
        qrScanner = await codeReader.decodeFromVideoDevice(undefined, video, (result, err) => {
            if (result) {
                const text = result.getText();
                console.log('QR Code scanned:', text);
                
                const match = text.match(/\d+/);
                if (match) {
                    document.getElementById('certificateId').value = match[0];
                    showStatus('verifyStatus', 'QR Code scanned! Token ID: ' + match[0], 'success');
                    stopQRScanner();
                    verifyCertificate();
                } else {
                    showStatus('verifyStatus', 'Invalid QR code. Please scan a certificate QR code.', 'error');
                }
            }
        });

        isScanning = true;
        const scannerBtn = document.querySelector('.qr-section .btn-secondary');
        if (scannerBtn) scannerBtn.textContent = 'Stop Scanner';
        
        showStatus('verifyStatus', 'Camera active. Point at a QR code.', 'pending');

    } catch (error) {
        console.error('QR Scanner error:', error);
        
        let errorMessage = 'Error starting QR scanner: ';
        if (error.name === 'NotAllowedError' || error.message.includes('Permission denied')) {
            errorMessage += 'Camera permission denied. Please allow camera access in your browser settings.';
        } else if (error.name === 'NotFoundError' || error.message.includes('No camera')) {
            errorMessage += 'No camera found on this device.';
        } else {
            errorMessage += error.message;
        }
        
        alert(errorMessage);
        stopQRScanner();
    }
}

function stopQRScanner() {
    try {
        if (qrScanner) {
            qrScanner.stop();
            qrScanner = null;
        }
        if (codeReader) {
            codeReader = null;
        }
        
        isScanning = false;
        const previewElem = document.getElementById('qr-reader');
        if (previewElem) {
            previewElem.innerHTML = '';
            previewElem.style.display = 'none';
        }
        
        const scannerBtn = document.querySelector('.qr-section .btn-secondary');
        if (scannerBtn) {
            scannerBtn.textContent = 'Start Scanner';
        }
        
        showStatus('verifyStatus', 'Scanner stopped', '');
        
    } catch (error) {
        console.error('Error stopping scanner:', error);
    }
}

// ============================================
// STATUS HELPER
// ============================================
function showStatus(elementId, message, type) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = message;
    el.className = 'status-bar ' + type;
    el.style.display = 'block';
}

// ============================================
// AUTO-CONNECT
// ============================================
window.addEventListener('load', async () => {
    if (typeof window.ethereum !== 'undefined') {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length > 0) {
                await connectWallet();
            }
        } catch (error) {
            console.log('Auto-connect skipped');
        }
    }
});

console.log('Certificate System DApp loaded');
console.log('System Contract:', CONFIG.systemAddress);
console.log('NFT Contract:', CONFIG.nftAddress);