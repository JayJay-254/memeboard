document.addEventListener('DOMContentLoaded', () => {
    // Get elements for Post a Meme card
    const urlBtn = document.getElementById('url-btn');
    const uploadBtn = document.getElementById('upload-btn');
    const textBtn = document.getElementById('text-btn');

    const urlInputGroup = document.getElementById('url-input');
    const uploadInputGroup = document.getElementById('upload-input');
    const textInputGroup = document.getElementById('text-input');

    const memeTitleInput = document.getElementById('meme-title');
    const memeDescriptionInput = document.getElementById('meme-description');
    const postMemeButton = document.querySelector('.post-meme-btn');
    const imageUploadInput = document.getElementById('image-upload'); // For actual file input

    const feedContainer = document.getElementById('feed-container');

    let activePostType = 'url'; // Keep track of the currently active post type

    // Function to activate a specific post type
    function setActivePostType(type) {
        // Deactivate all buttons and input groups
        urlBtn.classList.remove('active');
        uploadBtn.classList.remove('active');
        textBtn.classList.remove('active');

        urlInputGroup.classList.remove('active');
        uploadInputGroup.classList.remove('active');
        textInputGroup.classList.remove('active');

        // Activate the selected type
        if (type === 'url') {
            urlBtn.classList.add('active');
            urlInputGroup.classList.add('active');
        } else if (type === 'upload') {
            uploadBtn.classList.add('active');
            uploadInputGroup.classList.add('active');
        } else if (type === 'text') {
            textBtn.classList.add('active');
            textInputGroup.classList.add('active');
        }
        activePostType = type;
    }

    // Event listeners for the post type buttons
    urlBtn.addEventListener('click', () => setActivePostType('url'));
    uploadBtn.addEventListener('click', () => setActivePostType('upload'));
    textBtn.addEventListener('click', () => setActivePostType('text'));

    // Initialize the first active state (URL)
    setActivePostType(activePostType);

    // --- Post Meme Button Logic (Simplified for Front-End Mockup) ---
    postMemeButton.addEventListener('click', async () => {
        const title = memeTitleInput.value.trim();
        const description = memeDescriptionInput.value.trim();
        let content = ''; // This will hold the URL, or base64 data for upload, or text content

        if (!title) {
            alert('Please add a meme title!');
            return;
        }

        if (activePostType === 'url') {
            const urlInput = urlInputGroup.querySelector('input').value.trim();
            if (!urlInput) {
                alert('Please enter a URL for your meme!');
                return;
            }
            content = urlInput;
        } else if (activePostType === 'upload') {
            const file = imageUploadInput.files[0];
            if (!file) {
                alert('Please select an image to upload!');
                return;
            }
            // For a *real* app, you'd upload this to Firebase Storage and get a URL.
            // For this mockup, we'll convert it to a Data URL for immediate display.
            content = await readFileAsDataURL(file); // Utility function below
            if (!content) {
                alert('Could not read the image file.');
                return;
            }
        } else if (activePostType === 'text') {
            const textContent = textInputGroup.querySelector('textarea').value.trim();
            if (!textContent) {
                alert('Please write your text post!');
                return;
            }
            content = textContent;
        }

        // Create the new post element and add to feed
        createPostElement({
            title: title,
            description: description,
            type: activePostType,
            content: content, // This is the URL, Data URL, or text
            author: "username", // Mock user
            createdAt: new Date().toLocaleString(),
            likeCount: 0
        });

        // Clear input fields after posting
        memeTitleInput.value = '';
        memeDescriptionInput.value = '';
        urlInputGroup.querySelector('input').value = '';
        if (imageUploadInput) imageUploadInput.value = ''; // Clear file input
        textInputGroup.querySelector('textarea').value = '';
    });

    // Utility function to read file as Data URL (for local image preview)
    function readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (error) => reject(error);
            reader.readAsDataURL(file);
        });
    }

    // --- Create Post Element (Updated for new design) ---
    function createPostElement(postData) {
        const postDiv = document.createElement('div');
        postDiv.className = 'post';

        const postHeader = document.createElement('div');
        postHeader.className = 'post-header';
        postHeader.innerHTML = `
            <span class="material-icons profile-avatar">person</span>
            <div class="post-info">
                <div class="post-author">${postData.author}</div>
                <div class="post-time">${postData.createdAt}</div>
            </div>
        `;
        postDiv.appendChild(postHeader);

        const postContent = document.createElement('div');
        postContent.className = 'post-content';

        if (postData.title) {
            const postTitle = document.createElement('h4');
            postTitle.innerText = postData.title;
            postContent.appendChild(postTitle);
        }

        if (postData.description) {
            const postDescription = document.createElement('p');
            postDescription.innerText = postData.description;
            postContent.appendChild(postDescription);
        }

        if (postData.type === 'url' || postData.type === 'upload') {
            const postImage = document.createElement('img');
            postImage.src = postData.content;
            postImage.alt = postData.title || 'Meme image';
            postContent.appendChild(postImage);
        } else if (postData.type === 'text') {
            const postText = document.createElement('p');
            postText.innerText = postData.content;
            postContent.appendChild(postText);
        }
        
        postDiv.appendChild(postContent);

        const postFooter = document.createElement('div');
        postFooter.className = 'post-footer';
        
        let currentLikes = postData.likeCount || 0;
        const likeButton = document.createElement('button');
        likeButton.className = 'like-btn';
        likeButton.innerHTML = `<span class="material-icons">thumb_up</span> Like (${currentLikes})`;
        likeButton.addEventListener('click', () => {
            currentLikes++;
            likeButton.innerHTML = `<span class="material-icons">thumb_up</span> Like (${currentLikes})`;
            likeButton.classList.add('liked'); // Add a class to change color
        });

        const commentButton = document.createElement('button');
        commentButton.innerHTML = `<span class="material-icons">chat_bubble_outline</span> Comment`;

        const shareButton = document.createElement('button');
        shareButton.innerHTML = `<span class="material-icons">share</span> Share`;

        postFooter.appendChild(likeButton);
        postFooter.appendChild(commentButton);
        postFooter.appendChild(shareButton);
        postDiv.appendChild(postFooter);

        feedContainer.prepend(postDiv); // Add new posts to the top
    }

    // Example of a pre-existing post (optional, for initial view)
    createPostElement({
        title: "Inspiration for Your Day",
        description: "Remember that every step forward, no matter how small, is progress. Keep going!",
        type: "text",
        content: "The only way to do great work is to love what you do.",
        author: "MEMEBOARD Team",
        createdAt: "2 days ago",
        likeCount: 15
    });

    createPostElement({
        title: "First Post Meme!",
        description: "Testing out the new meme board functionality. Looks great!",
        type: "url",
        content: "https://i.imgflip.com/30b1gx.jpg", // Example meme URL
        author: "jayjay",
        createdAt: "1 hour ago",
        likeCount: 5
    });
});

  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-analytics.js";


  const firebaseConfig = {
    apiKey: "AIzaSyDAvYWXCQPU03PpYmZfQFLN9vrbmuzZypk",
    authDomain: "meme-load.firebaseapp.com",
    projectId: "meme-load",
    storageBucket: "meme-load.firebasestorage.app",
    messagingSenderId: "491918831099",
    appId: "1:491918831099:web:6037bf5028729a5a4f6f5e",
    measurementId: "G-P22L6VFPE3"
 };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);