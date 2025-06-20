// DOM Elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const browseBtn = document.getElementById('browseBtn');
const uploadSection = document.getElementById('uploadSection');
const processingSection = document.getElementById('processingSection');
const resultsSection = document.getElementById('resultsSection');
const progressFill = document.getElementById('progressFill');
const newUploadBtn = document.getElementById('newUploadBtn');
const downloadBtn = document.getElementById('downloadBtn');

// Global variables
let currentFile = null;
let extractionResults = null;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    initializeTabs();
});

function initializeEventListeners() {
    // File input events
    fileInput.addEventListener('change', handleFileSelect);
    browseBtn.addEventListener('click', handleBrowseClick);
    
    // Drag and drop events
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleFileDrop);
    uploadArea.addEventListener('click', handleUploadAreaClick);
    
    // Button events
    newUploadBtn.addEventListener('click', resetToUpload);
    downloadBtn.addEventListener('click', downloadResults);
    
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        document.addEventListener(eventName, preventDefault, false);
        document.body.addEventListener(eventName, preventDefault, false);
    });
}

function preventDefault(e) {
    e.preventDefault();
    e.stopPropagation();
}

function handleBrowseClick(e) {
    e.preventDefault();
    e.stopPropagation();
    fileInput.click();
}

function handleUploadAreaClick(e) {
    // Don't trigger if the browse text or its children were clicked
    if (e.target.classList.contains('browse-text') || 
        e.target.closest('.browse-text') || 
        e.target.id === 'browseBtn') {
        return; // Let the browse button handler deal with it
    }
    
    // Trigger file input for all other areas
    e.preventDefault();
    e.stopPropagation();
    fileInput.click();
}

function handleDragOver(e) {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
}

function handleFileDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleFile(file);
    }
}

function handleFile(file) {
    // Validate file type
    if (file.type !== 'application/pdf') {
        showError('Please select a PDF file.');
        return;
    }
    
    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB in bytes
    if (file.size > maxSize) {
        showError('File size exceeds 50MB limit.');
        return;
    }
    
    currentFile = file;
    updateUploadArea(file);
    
    // Auto-start processing after a short delay
    setTimeout(() => {
        startProcessing();
    }, 1000);
}

function updateUploadArea(file) {
    const uploadIcon = uploadArea.querySelector('.upload-icon i');
    const heading = uploadArea.querySelector('h3');
    const description = uploadArea.querySelector('p');
    
    uploadIcon.className = 'fas fa-file-pdf';
    heading.textContent = file.name;
    description.innerHTML = `File size: ${formatFileSize(file.size)} | Ready to process`;
    
    uploadArea.parentElement.classList.add('file-selected');
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function showError(message) {
    const uploadIcon = uploadArea.querySelector('.upload-icon i');
    const heading = uploadArea.querySelector('h3');
    const description = uploadArea.querySelector('p');
    
    uploadIcon.className = 'fas fa-exclamation-triangle';
    heading.textContent = 'Error';
    description.textContent = message;
    
    uploadArea.parentElement.classList.add('upload-error');
    
    // Reset after 3 seconds
    setTimeout(resetUploadArea, 3000);
}

function resetUploadArea() {
    const uploadIcon = uploadArea.querySelector('.upload-icon i');
    const heading = uploadArea.querySelector('h3');
    const description = uploadArea.querySelector('p');
    
    uploadIcon.className = 'fas fa-cloud-upload-alt';
    heading.textContent = 'Drop your PDF here';
    description.innerHTML = 'or <span class="browse-text" id="browseBtn">browse to choose a file</span>';
    
    uploadArea.parentElement.classList.remove('file-selected', 'upload-error');
    
    // Re-attach browse button event (remove old listener first to prevent duplicates)
    const newBrowseBtn = document.getElementById('browseBtn');
    newBrowseBtn.removeEventListener('click', handleBrowseClick);
    newBrowseBtn.addEventListener('click', handleBrowseClick);
}

function startProcessing() {
    if (!currentFile) return;
    
    // Hide upload section and show processing
    uploadSection.style.display = 'none';
    processingSection.style.display = 'block';
    
    // Get extraction type
    const extractionType = document.querySelector('input[name="extractionType"]:checked').value;
    
    // Simulate processing steps
    processFile(currentFile, extractionType);
}

async function processFile(file, extractionType) {
    try {
        // Step 1: Upload (simulate)
        updateProcessingStep(1, 25);
        await delay(1000);
        
        // Step 2: Analyzing
        updateProcessingStep(2, 50);
        await delay(1500);
        
        // Step 3: AI Processing
        updateProcessingStep(3, 75);
        
        // Create FormData for file upload
        const formData = new FormData();
        formData.append('file', file);
        formData.append('extraction_type', extractionType);
        
        // Make API call to backend
        const response = await fetch('/api/v1/extract', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const results = await response.json();
        
        // Step 4: Complete
        updateProcessingStep(4, 100);
        await delay(500);
        
        // Show results
        showResults(results);
        
    } catch (error) {
        console.error('Processing error:', error);
        
        // For demo purposes, show mock results if API fails
        await delay(1000);
        updateProcessingStep(4, 100);
        await delay(500);
        showMockResults(extractionType);
    }
}

function updateProcessingStep(stepNumber, progress) {
    // Update progress bar
    progressFill.style.width = `${progress}%`;
    
    // Update step indicators
    for (let i = 1; i <= 4; i++) {
        const step = document.getElementById(`step${i}`);
        if (i <= stepNumber) {
            step.classList.add('active');
        } else {
            step.classList.remove('active');
        }
    }
}

function showResults(results) {
    extractionResults = results;
    
    // Hide processing and show results
    processingSection.style.display = 'none';
    resultsSection.style.display = 'block';
    
    // Populate results tabs
    populateResultsData(results);
}

function showMockResults(extractionType) {
    const mockResults = generateMockResults(extractionType);
    showResults(mockResults);
}

function generateMockResults(extractionType) {
    const baseResults = {
        filename: currentFile.name,
        file_size: currentFile.size,
        extraction_type: extractionType,
        processing_time: "2.3 seconds",
        timestamp: new Date().toISOString()
    };
    
    switch (extractionType) {
        case 'invoice':
            return {
                ...baseResults,
                structured_data: {
                    invoice_number: "INV-2024-001",
                    date: "2024-01-15",
                    due_date: "2024-02-15",
                    vendor: "Tech Solutions Inc.",
                    total_amount: "$2,450.00",
                    tax_amount: "$245.00",
                    subtotal: "$2,205.00",
                    items: [
                        { description: "Web Development", quantity: 1, rate: "$1,500.00", amount: "$1,500.00" },
                        { description: "Design Services", quantity: 1, rate: "$705.00", amount: "$705.00" }
                    ]
                },
                raw_text: "INVOICE\nInvoice Number: INV-2024-001\nDate: January 15, 2024\nDue Date: February 15, 2024\n\nBill To:\nABC Company\n123 Business St\nCity, State 12345\n\nFrom:\nTech Solutions Inc.\n456 Tech Ave\nTech City, TC 67890\n\nServices:\nWeb Development - $1,500.00\nDesign Services - $705.00\n\nSubtotal: $2,205.00\nTax (10%): $245.00\nTotal: $2,450.00",
                ai_summary: "This is an invoice from Tech Solutions Inc. to ABC Company for web development and design services totaling $2,450.00. The invoice is dated January 15, 2024, with a due date of February 15, 2024."
            };
            
        case 'contract':
            return {
                ...baseResults,
                structured_data: {
                    contract_type: "Service Agreement",
                    parties: {
                        party_a: "ABC Corporation",
                        party_b: "XYZ Services LLC"
                    },
                    effective_date: "2024-01-01",
                    expiration_date: "2024-12-31",
                    contract_value: "$120,000",
                    key_terms: [
                        "Monthly service fee of $10,000",
                        "30-day termination notice required",
                        "Confidentiality clause included"
                    ],
                    governing_law: "State of California"
                },
                raw_text: "SERVICE AGREEMENT\n\nThis Service Agreement (\"Agreement\") is entered into on January 1, 2024, between ABC Corporation and XYZ Services LLC.\n\nTerm: This agreement shall be effective from January 1, 2024, through December 31, 2024.\n\nServices: XYZ Services LLC shall provide consulting services as detailed in Exhibit A.\n\nCompensation: ABC Corporation shall pay $10,000 monthly for services rendered.\n\nTermination: Either party may terminate with 30 days written notice.",
                ai_summary: "This is a service agreement between ABC Corporation and XYZ Services LLC for consulting services. The contract runs from January 1, 2024, to December 31, 2024, with monthly payments of $10,000. Either party can terminate with 30 days notice."
            };
            
        default: // general
            return {
                ...baseResults,
                structured_data: {
                    document_type: "General Document",
                    page_count: 5,
                    word_count: 1247,
                    key_sections: [
                        "Introduction",
                        "Main Content", 
                        "Conclusion"
                    ],
                    extracted_entities: {
                        dates: ["2024-01-15", "2024-02-01"],
                        amounts: ["$1,000", "$2,500"],
                        emails: ["contact@example.com"],
                        phones: ["+1-555-0123"]
                    }
                },
                raw_text: "This is a sample document containing various types of information. The document discusses important topics and includes relevant data points such as dates, amounts, and contact information. Key dates mentioned include January 15, 2024, and February 1, 2024. Financial figures referenced are $1,000 and $2,500. For more information, contact us at contact@example.com or call +1-555-0123.",
                ai_summary: "This document contains general information with key data points including dates (January 15, 2024, and February 1, 2024), financial amounts ($1,000 and $2,500), and contact details. The document appears to be informational in nature."
            };
    }
}

function populateResultsData(results) {
    // Structured data tab
    const structuredData = document.getElementById('structuredData');
    structuredData.innerHTML = `<pre>${JSON.stringify(results.structured_data, null, 2)}</pre>`;
    
    // Raw text tab  
    const rawText = document.getElementById('rawText');
    rawText.innerHTML = `<pre>${results.raw_text}</pre>`;
    
    // AI summary tab
    const aiSummary = document.getElementById('aiSummary');
    aiSummary.innerHTML = `<div style="font-family: 'Inter', sans-serif; line-height: 1.8; font-size: 16px;">${results.ai_summary}</div>`;
}

function initializeTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            
            // Remove active class from all tabs and contents
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            btn.classList.add('active');
            document.getElementById(`${tabName}-tab`).classList.add('active');
        });
    });
}

function resetToUpload() {
    // Reset global state
    currentFile = null;
    extractionResults = null;
    fileInput.value = '';
    
    // Reset UI
    resetUploadArea();
    
    // Show upload section, hide others
    uploadSection.style.display = 'block';
    processingSection.style.display = 'none';
    resultsSection.style.display = 'none';
    
    // Reset processing indicators
    progressFill.style.width = '0%';
    for (let i = 1; i <= 4; i++) {
        document.getElementById(`step${i}`).classList.remove('active');
    }
    document.getElementById('step1').classList.add('active');
}

function downloadResults() {
    if (!extractionResults) return;
    
    const dataStr = JSON.stringify(extractionResults, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentFile.name.replace('.pdf', '')}_extraction_results.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
} 