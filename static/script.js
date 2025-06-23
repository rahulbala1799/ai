// DOM Elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const browseBtn = document.getElementById('browseBtn');
const uploadSection = document.getElementById('uploadSection');
const processingSection = document.getElementById('processingSection');
const resultsSection = document.getElementById('resultsSection');
const fileList = document.getElementById('fileList');
const fileItems = document.getElementById('fileItems');
const clearFilesBtn = document.getElementById('clearFilesBtn');
const processFilesBtn = document.getElementById('processFilesBtn');
const newBatchBtn = document.getElementById('newBatchBtn');
const exportExcelBtn = document.getElementById('exportExcelBtn');

// Global variables
let selectedFiles = [];
let processedData = null;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    initializeTabs();
});

function initializeEventListeners() {
    // File input events
    fileInput.addEventListener('change', handleFileSelect);
    
    // Browse button
    if (browseBtn) {
        browseBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            fileInput.click();
        });
    }
    
    // Upload area click
    uploadArea.addEventListener('click', function(e) {
        if (selectedFiles.length === 0) {
            fileInput.click();
        }
    });
    
    // Drag and drop events
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleFileDrop);
    
    // Button events
    clearFilesBtn.addEventListener('click', clearAllFiles);
    processFilesBtn.addEventListener('click', startBatchProcessing);
    newBatchBtn.addEventListener('click', resetToUpload);
    exportExcelBtn.addEventListener('click', exportToExcel);
    
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
    
    const files = Array.from(e.dataTransfer.files);
    addFiles(files);
}

function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    addFiles(files);
}

function addFiles(files) {
    // Filter PDF files only
    const pdfFiles = files.filter(file => file.type === 'application/pdf');
    
    if (pdfFiles.length !== files.length) {
        showNotification('Only PDF files are allowed. Some files were skipped.', 'warning');
    }
    
    // Check file size limit (50MB per file)
    const validFiles = pdfFiles.filter(file => {
        if (file.size > 50 * 1024 * 1024) {
            showNotification(`File ${file.name} exceeds 50MB limit and was skipped.`, 'warning');
            return false;
        }
        return true;
    });
    
    // Add new files to selected files (avoid duplicates)
    validFiles.forEach(file => {
        if (!selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
            selectedFiles.push(file);
        }
    });
    
    // Check batch limit
    if (selectedFiles.length > 50) {
        selectedFiles = selectedFiles.slice(0, 50);
        showNotification('Maximum 50 files allowed. Extra files were removed.', 'warning');
    }
    
    updateFileDisplay();
    fileInput.value = ''; // Reset input
}

function updateFileDisplay() {
    if (selectedFiles.length === 0) {
        fileList.style.display = 'none';
        uploadArea.querySelector('h3').textContent = 'Drop multiple invoice PDFs here';
        uploadArea.querySelector('p').innerHTML = 'or <span class="browse-text" id="browseBtn">browse to choose files</span>';
        return;
    }
    
    // Update upload area
    uploadArea.querySelector('h3').textContent = `${selectedFiles.length} PDF(s) selected`;
    uploadArea.querySelector('p').textContent = 'Click to add more files or process the selected ones';
    
    // Show file list
    fileList.style.display = 'block';
    
    // Populate file items
    fileItems.innerHTML = '';
    selectedFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <div class="file-info">
                <i class="fas fa-file-pdf"></i>
                <span class="file-name">${file.name}</span>
                <span class="file-size">${formatFileSize(file.size)}</span>
            </div>
            <button class="remove-file-btn" onclick="removeFile(${index})" title="Remove file">
                <i class="fas fa-times"></i>
            </button>
        `;
        fileItems.appendChild(fileItem);
    });
}

function removeFile(index) {
    selectedFiles.splice(index, 1);
    updateFileDisplay();
}

function clearAllFiles() {
    selectedFiles = [];
    updateFileDisplay();
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function startBatchProcessing() {
    if (selectedFiles.length === 0) {
        showNotification('Please select at least one PDF file.', 'error');
        return;
    }
    
    // Hide upload section and show processing
    uploadSection.style.display = 'none';
    processingSection.style.display = 'block';
    
    // Update processing UI
    document.getElementById('totalCount').textContent = selectedFiles.length;
    document.getElementById('processedCount').textContent = '0';
    
    try {
        // Create FormData for batch upload
        const formData = new FormData();
        selectedFiles.forEach(file => {
            formData.append('files', file);
        });
        
        // Show progress
        updateProgress(10);
        
        // Send batch request
        const response = await fetch('/api/v1/batch-extract', {
            method: 'POST',
            body: formData
        });
        
        updateProgress(90);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        updateProgress(100);
        
        // Store processed data
        processedData = data;
        
        // Show results after short delay
        setTimeout(() => {
            showResults(data);
        }, 1000);
        
    } catch (error) {
        console.error('Batch processing error:', error);
        showError('Failed to process files: ' + error.message);
    }
}

function updateProgress(percentage) {
    const progressFill = document.getElementById('progressFill');
    progressFill.style.width = percentage + '%';
}

function showResults(data) {
    // Hide processing and show results
    processingSection.style.display = 'none';
    resultsSection.style.display = 'block';
    
    // Update stats
    updateResultsStats(data);
    
    // Populate tables
    populateInvoiceSummaryTable(data.invoices);
    populateLineItemsTable(data.invoices);
    showProcessingErrors(data.invoices);
}

function updateResultsStats(data) {
    const invoices = data.invoices || [];
    const successfulInvoices = invoices.filter(inv => !inv.error);
    
    document.getElementById('processedFilesCount').textContent = invoices.length;
    document.getElementById('totalInvoicesCount').textContent = successfulInvoices.length;
    
    // Calculate total amount
    let totalAmount = 0;
    successfulInvoices.forEach(invoice => {
        if (invoice.invoice_summary && invoice.invoice_summary.total_amount) {
            totalAmount += parseFloat(invoice.invoice_summary.total_amount) || 0;
        }
    });
    
    document.getElementById('totalAmountSum').textContent = `$${totalAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
}

function populateInvoiceSummaryTable(invoices) {
    const tbody = document.getElementById('summaryTableBody');
    tbody.innerHTML = '';
    
    invoices.forEach(invoice => {
        if (invoice.error) return; // Skip error records for summary table
        
        const summary = invoice.invoice_summary || {};
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${summary.filename || 'N/A'}</td>
            <td>${summary.invoice_number || 'N/A'}</td>
            <td>${summary.vendor_name || 'N/A'}</td>
            <td>${summary.invoice_date || 'N/A'}</td>
            <td>${summary.due_date || 'N/A'}</td>
            <td>$${(summary.total_amount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
            <td>${summary.po_number || 'N/A'}</td>
            <td><span class="status-badge success">Processed</span></td>
        `;
        
        tbody.appendChild(row);
    });
}

function populateLineItemsTable(invoices) {
    const tbody = document.getElementById('lineItemsTableBody');
    tbody.innerHTML = '';
    
    invoices.forEach(invoice => {
        if (invoice.error || !invoice.line_items) return;
        
        const summary = invoice.invoice_summary || {};
        
        invoice.line_items.forEach(item => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${summary.invoice_number || 'N/A'}</td>
                <td>${summary.vendor_name || 'N/A'}</td>
                <td>${item.item_description || 'N/A'}</td>
                <td>${item.category || 'N/A'}</td>
                <td>${item.quantity || 0}</td>
                <td>$${(item.unit_price || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                <td>$${(item.line_total || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
            `;
            
            tbody.appendChild(row);
        });
    });
}

function showProcessingErrors(invoices) {
    const errorList = document.getElementById('errorList');
    errorList.innerHTML = '';
    
    const errorInvoices = invoices.filter(inv => inv.error);
    
    if (errorInvoices.length === 0) {
        errorList.innerHTML = '<div class="no-errors">✅ All files processed successfully!</div>';
        return;
    }
    
    errorInvoices.forEach(invoice => {
        const errorItem = document.createElement('div');
        errorItem.className = 'error-item';
        errorItem.innerHTML = `
            <div class="error-header">
                <i class="fas fa-exclamation-triangle"></i>
                <span>Processing Error</span>
            </div>
            <div class="error-message">${invoice.error}</div>
        `;
        errorList.appendChild(errorItem);
    });
}

async function exportToExcel() {
    if (!processedData) {
        showNotification('No data to export', 'error');
        return;
    }
    
    try {
        exportExcelBtn.disabled = true;
        exportExcelBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating Excel...';
        
        const response = await fetch('/api/v1/export-excel', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(processedData)
        });
        
        if (!response.ok) {
            throw new Error(`Export failed: ${response.status}`);
        }
        
        // Download the Excel file
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = response.headers.get('Content-Disposition')?.split('filename=')[1] || 'invoice_batch.xlsx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showNotification('Excel file downloaded successfully!', 'success');
        
    } catch (error) {
        console.error('Export error:', error);
        showNotification('Failed to export Excel file: ' + error.message, 'error');
    } finally {
        exportExcelBtn.disabled = false;
        exportExcelBtn.innerHTML = '<i class="fas fa-file-excel"></i> Export to Excel';
    }
}

function initializeTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            
            // Remove active class from all tabs and contents
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            btn.classList.add('active');
            document.getElementById(targetTab + '-tab').classList.add('active');
        });
    });
}

function resetToUpload() {
    selectedFiles = [];
    processedData = null;
    
    // Reset UI
    resultsSection.style.display = 'none';
    uploadSection.style.display = 'block';
    updateFileDisplay();
    
    // Reset progress
    updateProgress(0);
}

function showError(message) {
    processingSection.style.display = 'none';
    uploadSection.style.display = 'block';
    showNotification(message, 'error');
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
} 