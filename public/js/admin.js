const APPWRITE_ENDPOINT = window.location.origin.includes('localhost') 
    ? 'https://cloud.appwrite.io/v1'
    : prompt('Enter Appwrite Endpoint (e.g., https://cloud.appwrite.io/v1)') || 'https://cloud.appwrite.io/v1';

const APPWRITE_PROJECT_ID = prompt('Enter Appwrite Project ID') || '';
const DATABASE_ID = prompt('Enter Database ID') || 'video_compression';
const COLLECTION_ID = prompt('Enter Collection ID') || 'posts';

let client, databases;
let currentFilter = 'all';
let autoRefreshInterval;

function initializeAppwrite() {
    if (!APPWRITE_PROJECT_ID) {
        document.getElementById('jobs-list').innerHTML = '<p class="error-message">Appwrite credentials not configured. Please refresh the page and enter your credentials.</p>';
        return false;
    }

    client = new Appwrite.Client();
    client
        .setEndpoint(APPWRITE_ENDPOINT)
        .setProject(APPWRITE_PROJECT_ID);

    databases = new Appwrite.Databases(client);
    
    document.getElementById('config-endpoint').textContent = APPWRITE_ENDPOINT;
    
    return true;
}

async function fetchStats() {
    try {
        const statuses = ['pending', 'processing', 'completed', 'failed'];
        
        for (const status of statuses) {
            const response = await databases.listDocuments(
                DATABASE_ID,
                COLLECTION_ID,
                [
                    Appwrite.Query.equal('compression_status', status),
                    Appwrite.Query.limit(1)
                ]
            );
            
            document.getElementById(`stat-${status}`).textContent = response.total;
        }
    } catch (error) {
        console.error('Failed to fetch stats:', error);
    }
}

async function fetchJobs() {
    try {
        const queries = [
            Appwrite.Query.orderDesc('$createdAt'),
            Appwrite.Query.limit(50)
        ];
        
        if (currentFilter !== 'all') {
            queries.unshift(Appwrite.Query.equal('compression_status', currentFilter));
        }
        
        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTION_ID,
            queries
        );
        
        displayJobs(response.documents);
    } catch (error) {
        console.error('Failed to fetch jobs:', error);
        document.getElementById('jobs-list').innerHTML = `<p class="error-message">Failed to load jobs: ${error.message}</p>`;
    }
}

function displayJobs(jobs) {
    const container = document.getElementById('jobs-list');
    
    if (jobs.length === 0) {
        container.innerHTML = '<p class="loading">No jobs found</p>';
        return;
    }
    
    container.innerHTML = jobs.map(job => {
        const status = job.compression_status || 'pending';
        const step = job.processing_step || '-';
        const progress = job.progress || 0;
        const errorMessage = job.error_message;
        
        return `
            <div class="job-item">
                <div class="job-header">
                    <div class="job-title">${job.title || `Post #${job.wp_post_id}`}</div>
                    <span class="status-badge ${status}">${status}</span>
                </div>
                
                <div class="job-details">
                    <div class="job-detail">
                        <strong>Post ID</strong>
                        <span>${job.wp_post_id}</span>
                    </div>
                    <div class="job-detail">
                        <strong>Step</strong>
                        <span>${step}</span>
                    </div>
                    <div class="job-detail">
                        <strong>Created</strong>
                        <span>${new Date(job.$createdAt).toLocaleString()}</span>
                    </div>
                    <div class="job-detail">
                        <strong>Document ID</strong>
                        <span style="font-size: 12px; word-break: break-all;">${job.$id}</span>
                    </div>
                </div>
                
                ${status === 'processing' ? `
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                ` : ''}
                
                ${errorMessage ? `
                    <div class="error-message">
                        <strong>Error:</strong> ${errorMessage}
                    </div>
                ` : ''}
                
                ${status === 'completed' && job.master_playlist_url ? `
                    <div class="job-detail" style="margin-top: 12px;">
                        <strong>Output:</strong>
                        <a href="${job.master_playlist_url}" target="_blank" style="color: #3b82f6;">View HLS Stream</a>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

async function refreshData() {
    await Promise.all([fetchStats(), fetchJobs()]);
}

function setupEventListeners() {
    document.getElementById('status-filter').addEventListener('change', (e) => {
        currentFilter = e.target.value;
        fetchJobs();
    });
}

function startAutoRefresh() {
    autoRefreshInterval = setInterval(refreshData, 10000);
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
}

window.addEventListener('load', async () => {
    if (initializeAppwrite()) {
        setupEventListeners();
        await refreshData();
        startAutoRefresh();
    }
});

window.addEventListener('beforeunload', () => {
    stopAutoRefresh();
});
