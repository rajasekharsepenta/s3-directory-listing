// S3 bucket name and domain
const bucketName = 'test-s3-dir-listing';
const s3Domain = 's3.ap-south-1.amazonaws.com';

// DOM Elements
const objectList = document.getElementById('object-list');
const breadcrumb = document.getElementById('breadcrumb');
const searchInput = document.getElementById('search');
const loading = document.getElementById('loading');
const errorAlert = document.getElementById('error');

// Variables for current path
let currentPath = '';

// Check if a key is a folder by checking if it ends with '/'
function isFolder(key) {
  return key.endsWith('/');
}

// Create a button for navigation (folders/files)
function createNavigationButton(key) {
  const button = document.createElement('button');
  button.classList.add('btn-link');
  button.style.border = 'none';
  button.style.background = 'none';
  button.style.cursor = 'pointer';

  // Create the icon element
  const icon = document.createElement('i');
  icon.className = isFolder(key) ? 'fas fa-folder mr-2' : 'fas fa-file mr-2';

  // Create the span element to hold the text
  const textSpan = document.createElement('span');

  if (isFolder(key)) {
    textSpan.textContent = key.slice(0, -1).split('/').pop();
  } else {
    textSpan.textContent = key.split('/').pop();
  }

  // Append the icon and the text span to the button
  button.appendChild(icon);
  button.appendChild(textSpan);

  // Handle button click
  button.onclick = (e) => {
    e.preventDefault();
    if (isFolder(key)) {
      navigateTo(key); // Navigate into the folder
    } else {
      window.location.href = `https://${bucketName}.${s3Domain}/${key}`;  // Download the file
    }
  };

  return button;
}

// Navigate to a folder path
function navigateTo(path) {
  currentPath = path;
  listObjects(currentPath); // List objects in the new folder
}

// Update breadcrumb navigation based on the current path
// function updateBreadcrumb(path) {
//   const parts = path.split('/').filter((part) => part);
//   let crumbPath = '';

//   breadcrumb.innerHTML = '<li class="breadcrumb-item"><button class="btn-link" onclick="navigateTo(\'\')">Home</button></li>';

//   parts.forEach((part, index) => {
//     crumbPath += part + '/';
//     const listItem = document.createElement('li');
//     listItem.className = 'breadcrumb-item';

//     if (index === parts.length - 1) {
//       listItem.textContent = part;
//       listItem.classList.add('active');
//     } else {
//       const button = document.createElement('button');
//       button.className = 'btn-link';
//       button.textContent = part;
//       button.style.border = 'none';
//       button.style.background = 'none';
//       button.style.cursor = 'pointer';

//       button.onclick = (e) => {
//         e.preventDefault();
//         navigateTo(crumbPath); // Navigate to this folder level
//       };

//       listItem.appendChild(button);
//     }

//     breadcrumb.appendChild(listItem);
//   });
// }
function updateBreadcrumb(path) {
    const parts = path.split('/').filter((part) => part);
    let crumbPath = '';

    // Modern styled Home button
    const homeButton = document.createElement('button');
    homeButton.className = 'home-button'; // Use the same class as in the index.html
    homeButton.textContent = 'Home';
    homeButton.onclick = (e) => {
        e.preventDefault();
        navigateTo(''); // Navigate to root
    };

    // Clear breadcrumb and add Home button
    breadcrumb.innerHTML = ''; // Clear previous breadcrumb items
    const homeListItem = document.createElement('li');
    homeListItem.className = 'breadcrumb-item';
    homeListItem.appendChild(homeButton);
    breadcrumb.appendChild(homeListItem);

    // Add the rest of the breadcrumb items
    parts.forEach((part, index) => {
        crumbPath += part + '/';
        const listItem = document.createElement('li');
        listItem.className = 'breadcrumb-item';

        if (index === parts.length - 1) {
            listItem.textContent = part;
            listItem.classList.add('active');
        } else {
            const button = document.createElement('button');
            button.className = 'btn-link';
            button.textContent = part;
            button.style.border = 'none';
            button.style.background = 'none';
            button.style.cursor = 'pointer';

            button.onclick = (e) => {
                e.preventDefault();
                navigateTo(crumbPath); // Navigate to this folder level
            };

            listItem.appendChild(button);
        }

        breadcrumb.appendChild(listItem);
    });
}

// Format file size
function formatSize(size) {
  if (isNaN(size)) {
    return 'Unknown';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let index;

  for (index = 0; size >= 1024 && index < units.length - 1; index++) {
    size /= 1024;
  }

  return `${size.toFixed(2)} ${units[index]}`;
}

// List objects and directories in S3
function listObjects(path) {
  const prefix = path ? `prefix=${path}&` : '';
  const url = `https://${bucketName}.${s3Domain}/?list-type=2&${prefix}delimiter=%2F`;

  loading.classList.remove('d-none');
  errorAlert.classList.add('d-none');

  fetch(url)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Error fetching objects: ${response.status}`);
      }
      return response.text();
    })
    .then((text) => {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, 'text/xml');
      const keys = Array.from(xmlDoc.getElementsByTagName('Key'));
      const prefixes = Array.from(xmlDoc.getElementsByTagName('CommonPrefixes'));

      // Map folders and files with their details
      const folders = prefixes.map((prefixElement) => ({
        key: prefixElement.querySelector('Prefix').textContent,
      }));

      const files = keys.map((keyElement) => {
        const key = keyElement.textContent;
        const lastModified = new Date(keyElement.nextElementSibling.textContent); // Assuming 'LastModified' is the next sibling
        const sizeElement = keyElement.parentNode.querySelector('Size');
        const size = sizeElement ? parseInt(sizeElement.textContent, 10) : NaN;
        return { key, lastModified, size };
      });

      // Filter out unnecessary files (like 'index.html', 'dark-mode.css', and 's3.js')
      const filteredFiles = files.filter(({ key }) => !['index.html', 'dark-mode.css', 's3.js' , 'download-removebg-preview.png' , 'images-removebg-preview.png'].includes(key));

      // Sort files by last modified date (newest first)
      filteredFiles.sort((a, b) => b.lastModified - a.lastModified);

      objectList.innerHTML = ''; // Clear the object list

      // Render folders
      folders.forEach(({ key }) => {
        const row = document.createElement('tr');
        const nameCell = document.createElement('td');
        const button = createNavigationButton(key);

        nameCell.appendChild(button);
        row.appendChild(nameCell);
        row.insertCell(-1).textContent = '';  // Empty cells for last modified and size
        row.insertCell(-1).textContent = '';
        objectList.appendChild(row);
      });

      // Render files sorted by last modified date
      filteredFiles.forEach(({ key, lastModified, size }) => {
        const row = document.createElement('tr');
        const nameCell = document.createElement('td');
        const button = createNavigationButton(key);

        nameCell.appendChild(button);
        row.appendChild(nameCell);
        row.insertCell(-1).textContent = lastModified.toLocaleString();
        row.insertCell(-1).textContent = formatSize(size);
        objectList.appendChild(row);
      });

      updateBreadcrumb(path);
      loading.classList.add('d-none');
    })
    .catch((error) => {
      console.error('Error fetching objects:', error);
      loading.classList.add('d-none');
      errorAlert.textContent = `Error fetching objects: ${error.message}`;
      errorAlert.classList.remove('d-none');
    });
}

// Search filter functionality
searchInput.addEventListener('input', (e) => {
  const filter = e.target.value.toLowerCase();
  const rows = objectList.getElementsByTagName('tr');

  for (let i = 0; i < rows.length; i++) {
    const nameCell = rows[i].getElementsByTagName('td')[0];
    const name = nameCell.textContent || nameCell.innerText;

    if (name.toLowerCase().indexOf(filter) > -1) {
      rows[i].style.display = '';
    } else {
      rows[i].style.display = 'none';
    }
  }
});

// Start by navigating to the root folder
navigateTo('');
