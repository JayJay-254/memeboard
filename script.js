    import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
        import { 
            getAuth, 
            onAuthStateChanged, 
            GoogleAuthProvider, 
            signInWithPopup, 
            signOut 
        } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
        import {
            getFirestore,
            collection,
            addDoc,
            query,
            orderBy,
            onSnapshot,
            serverTimestamp,
            doc,
            deleteDoc,
            updateDoc,
            runTransaction
        } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
        import {
            getStorage,
            ref,
            uploadBytes,
            getDownloadURL,
            deleteObject
        } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

        // ------------------------------------------------------------------
        // PASTE YOUR FIREBASE CONFIG HERE
        // ------------------------------------------------------------------
        // Get this from your Firebase project settings (Project Overview > Settings > General > Your apps)
 const firebaseConfig = {
    apiKey: "AIzaSyDAvYWXCQPU03PpYmZfQFLN9vrbmuzZypk",
    authDomain: "meme-load.firebaseapp.com",
    projectId: "meme-load",
    storageBucket: "meme-load.firebasestorage.app",
    messagingSenderId: "491918831099",
    appId: "1:491918831099:web:6037bf5028729a5a4f6f5e",
    measurementId: "G-P22L6VFPE3"
 };
    
        // ------------------------------------------------------------------

        // Initialize Firebase
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);
        const storage = getStorage(app);

        // Global state
        let currentUserId = null;
        let unsubscribeFeed = null; // To stop the listener when logged out

        // Get UI Elements
        const authWall = document.getElementById('auth-wall');
        const appContent = document.getElementById('app-content');
        const userProfileGuest = document.getElementById('user-profile-guest');
        const userProfileAuthed = document.getElementById('user-profile-authed');
        const userAvatar = document.getElementById('user-avatar');
        const userName = document.getElementById('user-name');
        const signInBtn = document.getElementById('sign-in-btn');
        const authWallSignInBtn = document.getElementById('auth-wall-signin-btn');
        const signOutBtn = document.getElementById('sign-out-btn');
        const feedContainer = document.getElementById('feed-container');

        // Post-Meme Card Elements
        const postTypeButtons = {
            url: document.getElementById('url-btn'),
            upload: document.getElementById('upload-btn'),
            text: document.getElementById('text-btn')
        };
        const postInputGroups = {
            url: document.getElementById('url-input'),
            upload: document.getElementById('upload-input'),
            text: document.getElementById('text-input')
        };
        const postInputs = {
            title: document.getElementById('meme-title'),
            description: document.getElementById('meme-description'),
            url: document.getElementById('url-input-field'),
            upload: document.getElementById('image-upload-field'),
            text: document.getElementById('text-input-field')
        };
        const postMemeButton = document.getElementById('post-meme-btn');
        let activePostType = 'url';

        // Modal Elements
        const modal = document.getElementById('custom-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalMessage = document.getElementById('modal-message');
        const modalCancelBtn = document.getElementById('modal-cancel-btn');
        const modalConfirmBtn = document.getElementById('modal-confirm-btn');
        let modalConfirmCallback = null;

        // --- 1. Authentication Controller ---
        
        onAuthStateChanged(auth, (user) => {
            if (user) {
                // User is signed in
                currentUserId = user.uid;
                
                // Update UI
                authWall.style.display = 'none';
                appContent.style.display = 'block';
                userProfileGuest.style.display = 'none';
                userProfileAuthed.style.display = 'flex';
                
                userAvatar.src = user.photoURL || `https://placehold.co/35x35/6c63ff/FFFFFF?text=${user.displayName.charAt(0)}`;
                userName.textContent = user.displayName;

                // Start listening to the feed
                listenToFeed();

            } else {
                // User is signed out
                currentUserId = null;

                // Update UI
                authWall.style.display = 'flex';
                appContent.style.display = 'none';
                userProfileGuest.style.display = 'flex';
                userProfileAuthed.style.display = 'none';

                // Stop listening to the feed
                if (unsubscribeFeed) {
                    unsubscribeFeed();
                }
                feedContainer.innerHTML = '<h2>Feed</h2><p style="color: var(--text-medium); text-align: center;">Sign in to see the feed.</p>';
            }
        });

        // --- 2. Sign-In / Sign-Out Logic ---

        const provider = new GoogleAuthProvider();

        const handleSignIn = () => {
            signInWithPopup(auth, provider).catch((error) => {
                console.error("Sign-in error", error);
                showModalAlert("Sign-In Failed", error.message);
            });
        };

        const handleSignOut = () => {
            signOut(auth).catch((error) => {
                console.error("Sign-out error", error);
            });
        };

        signInBtn.addEventListener('click', handleSignIn);
        authWallSignInBtn.addEventListener('click', handleSignIn);
        signOutBtn.addEventListener('click', handleSignOut);

        // --- 3. Post-Meme Card Logic ---

        // Switch between URL, Upload, Text
        Object.keys(postTypeButtons).forEach(type => {
            postTypeButtons[type].addEventListener('click', () => {
                // Deactivate all
                Object.values(postTypeButtons).forEach(btn => btn.classList.remove('active'));
                Object.values(postInputGroups).forEach(group => group.classList.remove('active'));
                
                // Activate selected
                postTypeButtons[type].classList.add('active');
                postInputGroups[type].classList.add('active');
                activePostType = type;
            });
        });

        // Handle Post Button Click
        postMemeButton.addEventListener('click', async () => {
            if (!currentUserId) {
                showModalAlert("Not Signed In", "You must be signed in to post.");
                return;
            }

            const title = postInputs.title.value.trim();
            if (!title) {
                showModalAlert("Missing Title", "Please enter a meme title.");
                return;
            }

            // Disable button to prevent double-posting
            postMemeButton.disabled = true;
            postMemeButton.textContent = 'Posting...';

            try {
                // This object will be saved to Firestore
                const postData = {
                    title: title,
                    description: postInputs.description.value.trim(),
                    type: activePostType,
                    authorId: currentUserId,
                    authorName: auth.currentUser.displayName,
                    authorAvatar: auth.currentUser.photoURL,
                    createdAt: serverTimestamp(),
                    likeCount: 0,
                    likes: {} // Use a map to track who liked
                };

                // Add content based on type
                if (activePostType === 'url') {
                    const url = postInputs.url.value.trim();
                    if (!url) throw new Error("Please enter an image URL.");
                    postData.imageUrl = url;
                } 
                else if (activePostType === 'upload') {
                    const file = postInputs.upload.files[0];
                    if (!file) throw new Error("Please select an image to upload.");

                    // 1. Create storage reference
                    const storageRef = ref(storage, `memes/${currentUserId}/${Date.now()}-${file.name}`);
                    
                    // 2. Upload file
                    const snapshot = await uploadBytes(storageRef, file);

                    // 3. Get download URL
                    const downloadURL = await getDownloadURL(snapshot.ref);
                    postData.imageUrl = downloadURL;
                }
                else if (activePostType === 'text') {
                    const text = postInputs.text.value.trim();
                    if (!text) throw new Error("Please enter some text for your post.");
                    postData.textContent = text;
                }

                // 4. Save post document to Firestore
                await addDoc(collection(db, "posts"), postData);

                // 5. Clear fields
                postInputs.title.value = '';
                postInputs.description.value = '';
                postInputs.url.value = '';
                postInputs.upload.value = '';
                postInputs.text.value = '';

            } catch (error) {
                console.error("Error posting meme: ", error);
                showModalAlert("Post Failed", error.message);
            } finally {
                // Re-enable button
                postMemeButton.disabled = false;
                postMemeButton.textContent = 'Post Meme';
            }
        });


        // --- 4. Feed Logic (Listen, Render, Delete, Like) ---

        function listenToFeed() {
            // Stop any previous listener
            if (unsubscribeFeed) {
                unsubscribeFeed();
            }

            const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
            
            unsubscribeFeed = onSnapshot(q, (snapshot) => {
                feedContainer.innerHTML = '<h2>Feed</h2>'; // Clear feed
                if (snapshot.empty) {
                    feedContainer.innerHTML += '<p style="color: var(--text-medium); text-align: center;">No memes yet. Be the first to post!</p>';
                    return;
                }
                snapshot.forEach(doc => {
                    renderPost(doc.id, doc.data());
                });
            }, (error) => {
                console.error("Error listening to feed: ", error);
                feedContainer.innerHTML = '<h2>Feed</h2><p style="color: var(--red-dot); text-align: center;">Error loading feed.</p>';
            });
        }

        function renderPost(id, data) {
            const postDiv = document.createElement('div');
            postDiv.className = 'post';
            postDiv.dataset.id = id;

            const time = data.createdAt ? data.createdAt.toDate().toLocaleString() : 'Just now';

            // Post Header
            const postHeader = document.createElement('div');
            postHeader.className = 'post-header';
            postHeader.innerHTML = `
                <img src="${data.authorAvatar || 'https://placehold.co/40x40/6c63ff/FFFFFF?text=U'}" alt="${data.authorName}" class="profile-avatar">
                <div class="post-info">
                    <div class="post-author">${data.authorName}</div>
                    <div class="post-time">${time}</div>
                </div>
            `;
            
            // Add Delete Button (if author matches)
            if (data.authorId === currentUserId) {
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-post-btn visible';
                deleteBtn.innerHTML = '<span class="material-icons">delete_outline</span>';
                deleteBtn.addEventListener('click', () => {
                    showModalConfirm(
                        "Delete Meme?",
                        "Are you sure you want to delete this post? This cannot be undone.",
                        () => handleDeletePost(id, data.imageUrl, data.type)
                    );
                });
                postHeader.appendChild(deleteBtn);
            }
            postDiv.appendChild(postHeader);

            // Post Content
            const postContent = document.createElement('div');
            postContent.className = 'post-content';
            
            if (data.title) postContent.innerHTML += `<h4>${data.title}</h4>`;
            if (data.description) postContent.innerHTML += `<p>${data.description}</p>`;
            if (data.imageUrl) {
                postContent.innerHTML += `<img src="${data.imageUrl}" alt="${data.title}" onerror="this.style.display='none'">`;
            }
            if (data.textContent) {
                postContent.innerHTML += `<p style="font-size: 1.2em; white-space: pre-wrap;">${data.textContent}</p>`;
            }
            postDiv.appendChild(postContent);

            // Post Footer (Like, Comment, Share)
            const postFooter = document.createElement('div');
            postFooter.className = 'post-footer';

            const likeButton = document.createElement('button');
            likeButton.className = 'like-btn';
            likeButton.innerHTML = `<span class="material-icons">thumb_up</span> Like (${data.likeCount || 0})`;
            
            // Check if current user has liked this post
            if (data.likes && data.likes[currentUserId]) {
                likeButton.classList.add('liked');
            }
            
            likeButton.addEventListener('click', () => handleLikePost(id));

            postFooter.innerHTML = `
                <button class="comment-btn"><span class="material-icons">chat_bubble_outline</span> Comment</button>
                <button class="share-btn"><span class="material-icons">share</span> Share</button>
            `;
            postFooter.prepend(likeButton); // Add like button first
            postDiv.appendChild(postFooter);

            feedContainer.appendChild(postDiv);
        }

        async function handleDeletePost(id, imageUrl, type) {
            if (!currentUserId) return;

            try {
                // 1. Delete Firestore document
                await deleteDoc(doc(db, "posts", id));
                
                // 2. If it was an 'upload' post, delete the file from Storage
                if (type === 'upload' && imageUrl) {
                    const imageRef = ref(storage, imageUrl); // Get ref from URL
                    await deleteObject(imageRef);
                }
                
                // UI will update automatically via onSnapshot
                
            } catch (error) {
                console.error("Error deleting post: ", error);
                showModalAlert("Delete Failed", error.message);
            }
        }

        async function handleLikePost(id) {
            if (!currentUserId) return;

            const postRef = doc(db, "posts", id);
            
            try {
                await runTransaction(db, async (transaction) => {
                    const postDoc = await transaction.get(postRef);
                    if (!postDoc.exists()) {
                        throw "Post does not exist!";
                    }

                    const data = postDoc.data();
                    let newLikeCount = data.likeCount || 0;
                    const newLikes = data.likes || {};
                    
                    if (newLikes[currentUserId]) {
                        // User already liked, so "unlike"
                        newLikeCount--;
                        delete newLikes[currentUserId];
                    } else {
                        // User has not liked, so "like"
                        newLikeCount++;
                        newLikes[currentUserId] = true;
                    }

                    transaction.update(postRef, { 
                        likeCount: newLikeCount,
                        likes: newLikes
                    });
                });
            } catch (error) {
                console.error("Error liking post: ", error);
            }
            // UI will update automatically via onSnapshot
        }


        // --- 5. Custom Modal Utilities ---

        function showModalAlert(title, message) {
            modalTitle.textContent = title;
            modalMessage.textContent = message;
            modalConfirmBtn.style.display = 'none'; // Hide confirm button
            modalCancelBtn.textContent = 'Close';
            modal.style.display = 'flex';
            
            modalConfirmCallback = null;
        }

        function showModalConfirm(title, message, onConfirm) {
            modalTitle.textContent = title;
            modalMessage.textContent = message;
            modalConfirmBtn.style.display = 'inline-block';
            modalConfirmBtn.textContent = 'Delete'; // or "Confirm"
            modalCancelBtn.textContent = 'Cancel';
            modal.style.display = 'flex';

            modalConfirmCallback = onConfirm;
        }

        function hideModal() {
            modal.style.display = 'none';
            modalConfirmCallback = null;
        }

        modalCancelBtn.addEventListener('click', hideModal);
        
        modalConfirmBtn.addEventListener('click', () => {
            if (modalConfirmCallback) {
                modalConfirmCallback();
            }
            hideModal();
        });

        // Close modal if clicking overlay
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideModal();
            }
        });