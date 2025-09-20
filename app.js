// Steganography Tool JavaScript
class SteganographyTool {
    constructor() {
        this.currentTab = 'hide';
        this.currentDataType = 'text';
        this.coverImage = null;
        this.stegoImage = null;
        this.hideFileData = null;
        this.extractFileData = null;
        this.maxCapacity = 0;
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchTab(e.target.closest('.tab-button').dataset.tab);
            });
        });

        // Data type switching
        document.querySelectorAll('.data-tab').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchDataType(e.target.closest('.data-tab').dataset.type);
            });
        });

        // Hide tab - Image upload
        this.setupDragDrop('hide-image-drop', 'hide-image-input', this.handleCoverImageUpload.bind(this));
        
        // Hide tab - File upload
        this.setupDragDrop('hide-file-drop', 'hide-file-input', this.handleHideFileUpload.bind(this));
        
        // Extract tab - Image upload
        this.setupDragDrop('extract-image-drop', 'extract-image-input', this.handleExtractImageUpload.bind(this));

        // Text input monitoring
        document.getElementById('message-text').addEventListener('input', this.updateTextInfo.bind(this));

        // Process buttons
        document.getElementById('hide-process-btn').addEventListener('click', this.processHideData.bind(this));
        document.getElementById('extract-process-btn').addEventListener('click', this.processExtractData.bind(this));

        // Download buttons
        document.getElementById('download-stego-btn').addEventListener('click', this.downloadStegoImage.bind(this));
        document.getElementById('download-file-btn').addEventListener('click', this.downloadExtractedFile.bind(this));
        document.getElementById('copy-text-btn').addEventListener('click', this.copyExtractedText.bind(this));

        // Password fields
        document.getElementById('hide-password').addEventListener('input', this.updateCapacity.bind(this));
    }

    switchTab(tab) {
        if (!tab) return;
        
        this.currentTab = tab;
        
        // Update tab buttons
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.tab === tab) {
                btn.classList.add('active');
            }
        });
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
            if (content.id === `${tab}-tab`) {
                content.classList.add('active');
            }
        });

        // Reset UI state
        this.resetResults();
    }

    switchDataType(type) {
        if (!type) return;
        
        this.currentDataType = type;
        
        // Update data type tabs
        document.querySelectorAll('.data-tab').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.type === type) {
                btn.classList.add('active');
            }
        });
        
        // Update data input content
        const textInput = document.getElementById('text-input');
        const fileInput = document.getElementById('file-input');
        
        if (type === 'text') {
            textInput.classList.remove('hidden');
            fileInput.classList.add('hidden');
        } else {
            textInput.classList.add('hidden');
            fileInput.classList.remove('hidden');
        }
        
        this.updateCapacity();
    }

    setupDragDrop(dropAreaId, inputId, handler) {
        const dropArea = document.getElementById(dropAreaId);
        const input = document.getElementById(inputId);
        
        if (!dropArea || !input) return;
        
        // Drag and drop events
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, this.preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => dropArea.classList.add('dragover'), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => dropArea.classList.remove('dragover'), false);
        });

        dropArea.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handler(files[0]);
            }
        });

        // Click to browse - handle clicks on the drop area or buttons within it
        dropArea.addEventListener('click', (e) => {
            // Prevent triggering on nested elements that might have their own handlers
            if (e.target === dropArea || e.target.closest('.btn--secondary')) {
                input.click();
            }
        });

        // File input change
        input.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handler(e.target.files[0]);
            }
        });
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    handleCoverImageUpload(file) {
        if (!this.validateImageFile(file)) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.coverImage = { file, img, data: e.target.result };
                this.displayImagePreview('hide', file, img);
                this.calculateCapacity();
                this.updateProcessButton();
            };
            img.onerror = () => {
                this.showToast('Failed to load image. Please try a different file.', 'error');
            };
            img.src = e.target.result;
        };
        reader.onerror = () => {
            this.showToast('Failed to read image file.', 'error');
        };
        reader.readAsDataURL(file);
    }

    handleHideFileUpload(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            this.hideFileData = {
                name: file.name,
                size: file.size,
                type: file.type,
                data: e.target.result
            };
            this.displayFileInfo('hide', file);
            this.updateCapacity();
            this.updateProcessButton();
        };
        reader.onerror = () => {
            this.showToast('Failed to read file.', 'error');
        };
        reader.readAsArrayBuffer(file);
    }

    handleExtractImageUpload(file) {
        if (!this.validateImageFile(file)) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.stegoImage = { file, img, data: e.target.result };
                this.displayImagePreview('extract', file, img);
                this.updateExtractButton();
            };
            img.onerror = () => {
                this.showToast('Failed to load image. Please try a different file.', 'error');
            };
            img.src = e.target.result;
        };
        reader.onerror = () => {
            this.showToast('Failed to read image file.', 'error');
        };
        reader.readAsDataURL(file);
    }

    validateImageFile(file) {
        const validTypes = ['image/png', 'image/bmp'];
        if (!validTypes.includes(file.type)) {
            this.showToast('Please select a PNG or BMP image file', 'error');
            return false;
        }
        
        // Check file size (max 50MB)
        if (file.size > 50 * 1024 * 1024) {
            this.showToast('Image file is too large. Please select a file smaller than 50MB.', 'error');
            return false;
        }
        
        return true;
    }

    displayImagePreview(type, file, img) {
        const preview = document.getElementById(`${type}-image-preview`);
        const previewImg = document.getElementById(`${type}-preview-img`);
        const imageName = document.getElementById(`${type}-image-name`);
        
        if (!preview || !previewImg || !imageName) return;
        
        previewImg.src = img.src;
        imageName.textContent = `${file.name} (${img.width}×${img.height})`;
        
        if (type === 'hide') {
            const capacityInfo = document.getElementById('hide-image-capacity');
            if (capacityInfo) {
                capacityInfo.textContent = `Size: ${this.formatFileSize(file.size)}`;
            }
        }
        
        preview.style.display = 'flex';
    }

    displayFileInfo(type, file) {
        const fileInfo = document.getElementById(`${type}-file-info`);
        const fileName = document.getElementById(`${type}-file-name`);
        const fileSize = document.getElementById(`${type}-file-size`);
        
        if (!fileInfo || !fileName || !fileSize) return;
        
        fileName.textContent = file.name;
        fileSize.textContent = this.formatFileSize(file.size);
        
        fileInfo.style.display = 'flex';
    }

    calculateCapacity() {
        if (!this.coverImage) {
            this.maxCapacity = 0;
            return;
        }
        
        const { width, height } = this.coverImage.img;
        // Each pixel has 3 RGB channels, we can use 1 bit per channel
        // Reserve some bits for metadata (file size, type, etc.)
        this.maxCapacity = Math.floor((width * height * 3) / 8) - 1024; // Reserve 1KB for metadata
        this.updateCapacity();
    }

    updateTextInfo() {
        const textInput = document.getElementById('message-text');
        if (!textInput) return;
        
        const text = textInput.value;
        const length = text.length;
        const size = new Blob([text]).size;
        
        const lengthSpan = document.getElementById('text-length');
        const sizeSpan = document.getElementById('text-size');
        
        if (lengthSpan) lengthSpan.textContent = `${length} characters`;
        if (sizeSpan) sizeSpan.textContent = `${size} bytes`;
        
        this.updateCapacity();
    }

    updateCapacity() {
        if (!this.coverImage) {
            this.resetCapacity();
            return;
        }
        
        let dataSize = 0;
        
        if (this.currentDataType === 'text') {
            const textInput = document.getElementById('message-text');
            if (textInput) {
                const text = textInput.value;
                dataSize = new Blob([text]).size;
            }
        } else if (this.hideFileData) {
            dataSize = this.hideFileData.size;
        }
        
        // Add metadata overhead
        dataSize += 256; // Reserve for metadata
        
        const percentage = Math.min((dataSize / this.maxCapacity) * 100, 100);
        const capacityFill = document.getElementById('capacity-fill');
        const capacityText = document.getElementById('capacity-text');
        const capacityStatus = document.getElementById('capacity-status');
        
        if (capacityFill) capacityFill.style.width = `${percentage}%`;
        if (capacityText) capacityText.textContent = `Capacity: ${this.formatFileSize(dataSize)} / ${this.formatFileSize(this.maxCapacity)}`;
        
        if (capacityStatus) {
            if (dataSize > this.maxCapacity) {
                capacityStatus.textContent = 'Exceeds capacity';
                capacityStatus.className = 'status error';
            } else if (dataSize > 0) {
                capacityStatus.textContent = 'Within capacity';
                capacityStatus.className = 'status success';
            } else {
                capacityStatus.textContent = '';
                capacityStatus.className = 'status';
            }
        }
        
        this.updateProcessButton();
    }

    resetCapacity() {
        const capacityFill = document.getElementById('capacity-fill');
        const capacityText = document.getElementById('capacity-text');
        const capacityStatus = document.getElementById('capacity-status');
        
        if (capacityFill) capacityFill.style.width = '0%';
        if (capacityText) capacityText.textContent = 'Capacity: 0 / 0 bytes';
        if (capacityStatus) capacityStatus.textContent = '';
    }

    updateProcessButton() {
        const btn = document.getElementById('hide-process-btn');
        if (!btn) return;
        
        const hasImage = !!this.coverImage;
        const hasData = this.currentDataType === 'text' 
            ? (document.getElementById('message-text')?.value.length > 0)
            : !!this.hideFileData;
        const withinCapacity = this.getCurrentDataSize() <= this.maxCapacity;
        
        btn.disabled = !(hasImage && hasData && withinCapacity);
    }

    updateExtractButton() {
        const btn = document.getElementById('extract-process-btn');
        if (btn) {
            btn.disabled = !this.stegoImage;
        }
    }

    getCurrentDataSize() {
        if (this.currentDataType === 'text') {
            const textInput = document.getElementById('message-text');
            if (textInput) {
                const text = textInput.value;
                return new Blob([text]).size + 256;
            }
        } else if (this.hideFileData) {
            return this.hideFileData.size + 256;
        }
        return 0;
    }

    async processHideData() {
        this.showProgress('hide', 'Preparing data...');
        
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = this.coverImage.img;
            
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            // Prepare data to hide
            let dataToHide;
            let metadata = {};
            
            if (this.currentDataType === 'text') {
                const text = document.getElementById('message-text').value;
                dataToHide = new TextEncoder().encode(text);
                metadata = { type: 'text', size: dataToHide.length };
            } else {
                dataToHide = new Uint8Array(this.hideFileData.data);
                metadata = {
                    type: 'file',
                    size: dataToHide.length,
                    filename: this.hideFileData.name,
                    mimetype: this.hideFileData.type
                };
            }
            
            this.updateProgress('hide', 25, 'Encrypting data...');
            
            // Apply encryption if password is provided
            const password = document.getElementById('hide-password').value;
            if (password) {
                dataToHide = this.xorEncrypt(dataToHide, password);
                metadata.encrypted = true;
            }
            
            this.updateProgress('hide', 50, 'Embedding data in image...');
            
            // Embed data using LSB steganography
            const success = this.embedDataInImage(imageData, dataToHide, metadata);
            
            if (!success) {
                throw new Error('Failed to embed data in image');
            }
            
            this.updateProgress('hide', 75, 'Generating steganographic image...');
            
            ctx.putImageData(imageData, 0, 0);
            
            this.updateProgress('hide', 100, 'Complete!');
            
            // Show results
            this.showHideResults(canvas);
            
        } catch (error) {
            console.error('Hide process error:', error);
            this.showToast(`Error: ${error.message}`, 'error');
            this.hideProgress('hide');
        }
    }

    async processExtractData() {
        this.showProgress('extract', 'Loading steganographic image...');
        
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = this.stegoImage.img;
            
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            this.updateProgress('extract', 25, 'Extracting hidden data...');
            
            // Extract data using LSB steganography
            const result = this.extractDataFromImage(imageData);
            
            if (!result) {
                throw new Error('No hidden data found or data is corrupted');
            }
            
            this.updateProgress('extract', 50, 'Decrypting data...');
            
            let { data, metadata } = result;
            
            // Apply decryption if password is provided and data is encrypted
            const password = document.getElementById('extract-password').value;
            if (metadata.encrypted) {
                if (!password) {
                    throw new Error('Password required to decrypt hidden data');
                }
                data = this.xorEncrypt(data, password);
            }
            
            this.updateProgress('extract', 75, 'Processing extracted data...');
            
            this.updateProgress('extract', 100, 'Complete!');
            
            // Show results
            this.showExtractResults(data, metadata);
            
        } catch (error) {
            console.error('Extract process error:', error);
            this.showToast(`Error: ${error.message}`, 'error');
            this.hideProgress('extract');
        }
    }

    embedDataInImage(imageData, data, metadata) {
        const pixels = imageData.data;
        const metadataStr = JSON.stringify(metadata);
        const metadataBytes = new TextEncoder().encode(metadataStr);
        
        // Create header: [metadata_length(4 bytes)][metadata][data]
        const header = new Uint8Array(4);
        const metadataLength = metadataBytes.length;
        header[0] = (metadataLength >> 24) & 0xFF;
        header[1] = (metadataLength >> 16) & 0xFF;
        header[2] = (metadataLength >> 8) & 0xFF;
        header[3] = metadataLength & 0xFF;
        
        const fullData = new Uint8Array(header.length + metadataBytes.length + data.length);
        fullData.set(header, 0);
        fullData.set(metadataBytes, header.length);
        fullData.set(data, header.length + metadataBytes.length);
        
        // Convert to binary string
        let binaryData = '';
        for (let i = 0; i < fullData.length; i++) {
            binaryData += fullData[i].toString(2).padStart(8, '0');
        }
        
        // Check if we have enough capacity
        const maxBits = Math.floor(pixels.length / 4) * 3; // 3 bits per pixel (R,G,B)
        if (binaryData.length > maxBits) {
            return false;
        }
        
        // Embed bits in LSB of RGB channels (skip alpha channel)
        let bitIndex = 0;
        for (let i = 0; i < pixels.length && bitIndex < binaryData.length; i += 4) {
            // R channel
            if (bitIndex < binaryData.length) {
                pixels[i] = (pixels[i] & 0xFE) | parseInt(binaryData[bitIndex++]);
            }
            // G channel
            if (bitIndex < binaryData.length) {
                pixels[i + 1] = (pixels[i + 1] & 0xFE) | parseInt(binaryData[bitIndex++]);
            }
            // B channel
            if (bitIndex < binaryData.length) {
                pixels[i + 2] = (pixels[i + 2] & 0xFE) | parseInt(binaryData[bitIndex++]);
            }
        }
        
        return true;
    }

    extractDataFromImage(imageData) {
        const pixels = imageData.data;
        
        // Extract header (metadata length - 4 bytes)
        let binaryHeader = '';
        
        for (let i = 0; i < pixels.length && binaryHeader.length < 32; i += 4) {
            // R channel
            if (binaryHeader.length < 32) binaryHeader += (pixels[i] & 1).toString();
            // G channel
            if (binaryHeader.length < 32) binaryHeader += (pixels[i + 1] & 1).toString();
            // B channel
            if (binaryHeader.length < 32) binaryHeader += (pixels[i + 2] & 1).toString();
        }
        
        if (binaryHeader.length < 32) {
            return null;
        }
        
        const metadataLength = parseInt(binaryHeader.substring(0, 32), 2);
        if (metadataLength <= 0 || metadataLength > 1024) {
            return null;
        }
        
        // Extract metadata + data
        const totalBitsNeeded = 32 + (metadataLength * 8);
        let binaryData = '';
        
        for (let i = 0; i < pixels.length && binaryData.length < totalBitsNeeded; i += 4) {
            // R channel
            if (binaryData.length < totalBitsNeeded) binaryData += (pixels[i] & 1).toString();
            // G channel
            if (binaryData.length < totalBitsNeeded) binaryData += (pixels[i + 1] & 1).toString();
            // B channel
            if (binaryData.length < totalBitsNeeded) binaryData += (pixels[i + 2] & 1).toString();
        }
        
        if (binaryData.length < totalBitsNeeded) {
            return null;
        }
        
        // Extract metadata
        const binaryMetadata = binaryData.substring(32, 32 + (metadataLength * 8));
        const metadataBytes = new Uint8Array(metadataLength);
        for (let i = 0; i < metadataLength; i++) {
            const binaryByte = binaryMetadata.substring(i * 8, (i + 1) * 8);
            metadataBytes[i] = parseInt(binaryByte, 2);
        }
        
        const metadataStr = new TextDecoder().decode(metadataBytes);
        let metadata;
        try {
            metadata = JSON.parse(metadataStr);
        } catch {
            return null;
        }
        
        // Extract actual data
        const dataLength = metadata.size;
        const dataBitsStart = 32 + (metadataLength * 8);
        const dataBitsEnd = dataBitsStart + (dataLength * 8);
        
        // Continue extracting data bits
        while (binaryData.length < dataBitsEnd && pixels.length > 0) {
            const pixelIndex = Math.floor(binaryData.length / 3) * 4;
            const channelOffset = binaryData.length % 3;
            
            if (pixelIndex + channelOffset < pixels.length) {
                binaryData += (pixels[pixelIndex + channelOffset] & 1).toString();
            } else {
                break;
            }
        }
        
        if (binaryData.length < dataBitsEnd) {
            return null;
        }
        
        const binaryDataPart = binaryData.substring(dataBitsStart, dataBitsEnd);
        const data = new Uint8Array(dataLength);
        for (let i = 0; i < dataLength; i++) {
            const binaryByte = binaryDataPart.substring(i * 8, (i + 1) * 8);
            data[i] = parseInt(binaryByte, 2);
        }
        
        return { data, metadata };
    }

    xorEncrypt(data, password) {
        const key = new TextEncoder().encode(password);
        const encrypted = new Uint8Array(data.length);
        
        for (let i = 0; i < data.length; i++) {
            encrypted[i] = data[i] ^ key[i % key.length];
        }
        
        return encrypted;
    }

    showHideResults(canvas) {
        // Show original image
        const originalCanvas = document.getElementById('original-canvas');
        const originalCtx = originalCanvas.getContext('2d');
        originalCanvas.width = this.coverImage.img.width;
        originalCanvas.height = this.coverImage.img.height;
        originalCtx.drawImage(this.coverImage.img, 0, 0);
        
        // Show steganographic image
        const stegoCanvas = document.getElementById('stego-canvas');
        const stegoCtx = stegoCanvas.getContext('2d');
        stegoCanvas.width = canvas.width;
        stegoCanvas.height = canvas.height;
        stegoCtx.drawImage(canvas, 0, 0);
        
        // Store for download
        this.resultCanvas = canvas;
        
        this.hideProgress('hide');
        document.getElementById('hide-result').classList.remove('hidden');
        this.showToast('Data successfully hidden in image!', 'success');
    }

    showExtractResults(data, metadata) {
        const extractedTextSection = document.getElementById('extracted-text-section');
        const extractedFileSection = document.getElementById('extracted-file-section');
        
        if (metadata.type === 'text') {
            const text = new TextDecoder().decode(data);
            const extractedText = document.getElementById('extracted-text');
            if (extractedText) extractedText.value = text;
            
            if (extractedTextSection) extractedTextSection.style.display = 'block';
            if (extractedFileSection) extractedFileSection.style.display = 'none';
        } else {
            this.extractFileData = {
                data: data,
                name: metadata.filename || 'extracted_file',
                type: metadata.mimetype || 'application/octet-stream'
            };
            
            const fileName = document.getElementById('extracted-file-name');
            const fileSize = document.getElementById('extracted-file-size');
            
            if (fileName) fileName.textContent = this.extractFileData.name;
            if (fileSize) fileSize.textContent = this.formatFileSize(data.length);
            
            if (extractedTextSection) extractedTextSection.style.display = 'none';
            if (extractedFileSection) extractedFileSection.style.display = 'block';
        }
        
        this.hideProgress('extract');
        const extractResult = document.getElementById('extract-result');
        if (extractResult) extractResult.classList.remove('hidden');
        this.showToast('Data successfully extracted from image!', 'success');
    }

    downloadStegoImage() {
        if (!this.resultCanvas) return;
        
        const link = document.createElement('a');
        link.download = 'steganographic_image.png';
        link.href = this.resultCanvas.toDataURL('image/png');
        link.click();
    }

    downloadExtractedFile() {
        if (!this.extractFileData) return;
        
        const blob = new Blob([this.extractFileData.data], { type: this.extractFileData.type });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = this.extractFileData.name;
        link.click();
        URL.revokeObjectURL(url);
    }

    copyExtractedText() {
        const textArea = document.getElementById('extracted-text');
        if (!textArea) return;
        
        textArea.select();
        textArea.setSelectionRange(0, 99999); // For mobile devices
        
        try {
            document.execCommand('copy');
            this.showToast('Text copied to clipboard!', 'success');
        } catch (err) {
            // Fallback for modern browsers
            if (navigator.clipboard) {
                navigator.clipboard.writeText(textArea.value).then(() => {
                    this.showToast('Text copied to clipboard!', 'success');
                }).catch(() => {
                    this.showToast('Failed to copy text to clipboard', 'error');
                });
            } else {
                this.showToast('Copy to clipboard not supported', 'error');
            }
        }
    }

    showProgress(type, message) {
        const progressSection = document.getElementById(`${type}-progress`);
        const progressText = document.getElementById(`${type}-progress-text`);
        const progressFill = document.getElementById(`${type}-progress-fill`);
        
        if (progressSection) progressSection.classList.remove('hidden');
        if (progressText) progressText.textContent = message;
        if (progressFill) progressFill.style.width = '0%';
    }

    updateProgress(type, percentage, message) {
        const progressText = document.getElementById(`${type}-progress-text`);
        const progressFill = document.getElementById(`${type}-progress-fill`);
        
        if (progressText) progressText.textContent = message;
        if (progressFill) progressFill.style.width = `${percentage}%`;
    }

    hideProgress(type) {
        const progressSection = document.getElementById(`${type}-progress`);
        if (progressSection) progressSection.classList.add('hidden');
    }

    resetResults() {
        const hideResult = document.getElementById('hide-result');
        const extractResult = document.getElementById('extract-result');
        
        if (hideResult) hideResult.classList.add('hidden');
        if (extractResult) extractResult.classList.add('hidden');
        
        this.hideProgress('hide');
        this.hideProgress('extract');
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-in forwards';
            setTimeout(() => {
                if (container.contains(toast)) {
                    container.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Add slide out animation for toasts
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }
`;
document.head.appendChild(style);

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new SteganographyTool();
});