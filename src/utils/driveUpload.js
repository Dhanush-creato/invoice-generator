/**
 * Google Drive direct-upload module for the Invoice Generator
 * -------------------------------------------------------------
 * OAuth Client ID: 382982231043-48fcpsua9s3gi9bkboe9c891bqqh1noa.apps.googleusercontent.com
 */

const CLIENT_ID = "382982231043-48fcpsua9s3gi9bkboe9c891bqqh1noa.apps.googleusercontent.com";
const SCOPES = "https://www.googleapis.com/auth/drive.file";

let tokenClient = null;
let accessToken = null;

// Initialize the OAuth token client (call once on page/component load)
export function initDriveAuth() {
  if (typeof window === "undefined" || !window.google || !window.google.accounts) {
    return;
  }
  if (tokenClient) return;

  try {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (response) => {
        if (response.access_token) {
          accessToken = response.access_token;
        }
      },
    });
  } catch (err) {
    console.warn("Google Drive OAuth init warning:", err);
  }
}

// Ensures we have a valid access token, prompting user consent if needed
export function ensureAuth() {
  return new Promise((resolve, reject) => {
    if (accessToken) {
      resolve(accessToken);
      return;
    }
    if (!window.google || !window.google.accounts) {
      reject(new Error("Google Identity Services library not loaded yet. Please try again in a moment."));
      return;
    }
    if (!tokenClient) {
      initDriveAuth();
    }
    if (!tokenClient) {
      reject(new Error("Could not initialize Google Drive authorization token client."));
      return;
    }

    tokenClient.callback = (response) => {
      if (response.error) {
        reject(response);
        return;
      }
      accessToken = response.access_token;
      resolve(accessToken);
    };
    tokenClient.requestAccessToken({ prompt: "consent" });
  });
}

/**
 * Searches for an existing folder by name or creates a new one in Google Drive.
 * @param {string} folderName - e.g. "ICON Invoices" or "ICON Quotations"
 * @returns {Promise<string>} folderId
 */
export async function getOrCreateFolder(folderName) {
  await ensureAuth();

  // 1. Search for existing folder with exact name
  const query = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (searchRes.ok) {
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id;
    }
  }

  // 2. Folder does not exist, create a new one
  const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json();
    throw new Error(`Failed to create folder '${folderName}': ${JSON.stringify(err)}`);
  }

  const newFolderData = await createRes.json();
  return newFolderData.id;
}

/**
 * Uploads a PDF Blob directly to the user's Google Drive inside "ICON Invoices" or "ICON Quotations" folder.
 * @param {Blob} pdfBlob - the generated PDF Blob
 * @param {string} fileName - e.g. "Invoice_391.pdf"
 * @param {boolean} isQuotation - whether this file is a quotation
 * @returns {Promise<{id: string, webViewLink: string}>}
 */
export async function uploadPdfToDrive(pdfBlob, fileName, isQuotation = false) {
  await ensureAuth();

  const folderName = isQuotation ? "ICON Quotations" : "ICON Invoices";
  let folderId = null;
  try {
    folderId = await getOrCreateFolder(folderName);
  } catch (err) {
    console.warn("Folder lookup/creation warning:", err);
  }

  const metadata = {
    name: fileName,
    mimeType: "application/pdf",
    ...(folderId ? { parents: [folderId] } : {}),
  };

  const form = new FormData();
  form.append(
    "metadata",
    new Blob([JSON.stringify(metadata)], { type: "application/json" })
  );
  form.append("file", pdfBlob);

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Drive upload failed: ${JSON.stringify(err)}`);
  }

  const data = await res.json();
  console.log(`Uploaded to Google Drive in folder '${folderName}':`, data.webViewLink);
  return data;
}
