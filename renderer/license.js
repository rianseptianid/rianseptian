const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    const licenseInput = document.getElementById('licenseKey');
    const activateBtn = document.getElementById('activateBtn');
    const errorMessage = document.getElementById('errorMessage');

    // Auto-format license key input (optional, e.g., adding dashes)
    licenseInput.addEventListener('input', (e) => {
        let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        let formatted = '';
        for (let i = 0; i < val.length; i++) {
            if (i > 0 && i % 4 === 0) formatted += '-';
            formatted += val[i];
        }
        e.target.value = formatted;
        
        // Clear error when typing
        if (errorMessage.classList.contains('show')) {
            errorMessage.classList.remove('show');
        }
    });

    activateBtn.addEventListener('click', async () => {
        const key = licenseInput.value.trim();
        
        if (!key || key.length < 16) {
            showError('Please enter a valid license key.');
            return;
        }

        // Set loading state
        activateBtn.classList.add('loading');
        activateBtn.disabled = true;
        licenseInput.disabled = true;

        try {
            // Send validation request to main process
            const response = await ipcRenderer.invoke('verify-license', key);
            
            if (response.success) {
                // Show success
                showError('License valid! Starting app...', true);
                
                // Let main process close this window and open main window
                setTimeout(() => {
                    ipcRenderer.send('license-verified');
                }, 1000);
            } else {
                // Show error from backend
                showError(response.message || 'Invalid license key.');
                resetBtn();
            }
        } catch (error) {
            showError('Connection error. Please try again.');
            resetBtn();
        }
    });

    function showError(msg, isSuccess = false) {
        errorMessage.textContent = msg;
        errorMessage.className = 'error-message show';
        if (isSuccess) {
            errorMessage.classList.add('success-text');
        }
    }

    function resetBtn() {
        activateBtn.classList.remove('loading');
        activateBtn.disabled = false;
        licenseInput.disabled = false;
        licenseInput.focus();
    }
});
