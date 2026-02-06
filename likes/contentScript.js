(async () => {
  let youtubeLeftControls, youtubePlayer;
  let currentVideo = "";
  let currentVideoBookmarks = [];
  let type = "";

  const API_KEY = "AIzaSyDDsIbmQM3GJnJKuGbG2Jzv49Ics8w2eBc";
  function addButton() {
    const targetElement = document.getElementById("owner");

    if (targetElement) {
      const buttonExists = document.getElementById("extract");
      if (!buttonExists) {
        const button = document.createElement("button");
        button.innerHTML =
          '<div class="cbox yt-spec-button-shape-next__button-text-content"><span class="yt-core-attributed-string yt-core-attributed-string--white-space-no-wrap" role="text">Extract Transcript</span></div>';
        button.class =
          "yt-spec-button-shape-next yt-spec-button-shape-next--filled yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-m";
        button.id = "extract";
        button.addEventListener("click", extractTranscript);
        targetElement.appendChild(button);
      }
    }
  }

  function copyToClipboard(text) {
    const textarea = document.createElement("textarea");
    textarea.innerText = text;
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
      console.log("Text copied to clipboard");
    } catch (err) {
      console.error("Unable to copy text: ", err);
    } finally {
      document.body.removeChild(textarea);
    }
  }

  function extractTranscript() {
    const transcriptDropdown = document.querySelector("ytd-menu-renderer[class='style-scope ytd-watch-metadata'] yt-button-shape[id='button-shape'] div[class='yt-spec-touch-feedback-shape__fill']");

    if (transcriptDropdown) {
      transcriptDropdown.click();

      setTimeout(() => {
        const showTranscriptButton = document.querySelector(".yt-spec-button-shape-next.yt-spec-button-shape-next--outline.yt-spec-button-shape-next--call-to-action.yt-spec-button-shape-next--size-m");

        if (showTranscriptButton) {
          showTranscriptButton.click();

          setTimeout(() => {
            const transcriptLines = Array.from(document.querySelectorAll("yt-formatted-string.segment-text"));
            const transcriptContent = transcriptLines.map((line) => line.innerText).join("\n");
            copyToClipboard(transcriptContent);

            const newTab = window.open("https://chat.openai.com/", "_blank");
          }, 1000);
        }
      }, 1000);
    }
  }

  addButton();

  const fetchBookmarks = () => {
    return new Promise((resolve) => {
      chrome.storage.sync.get([currentVideo], (obj) => {
        resolve(obj[currentVideo] ? JSON.parse(obj[currentVideo]) : []);
      });
    });
  };
  function convertToTime(seconds) {
      if (isNaN(seconds) || seconds < 0) {
        return "Invalid input";
      }
    
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const remainingSeconds = Math.floor(seconds % 60);
    
      const formattedTime = [hours, minutes, remainingSeconds]
        .map(unit => unit.toString().padStart(2, "0"))
        .join(":");
    
      return formattedTime;
    }
  const addNewBookmarkEventHandler = async () => {
    const currentTime = youtubePlayer.currentTime;
    const newBookmark = {
      time: currentTime,
      desc: "Bookmark at " + convertToTime(currentTime),
    };
    console.log(newBookmark);

    currentVideoBookmarks = await fetchBookmarks();

    chrome.storage.sync.set({
      [currentVideo]: JSON.stringify([...currentVideoBookmarks, newBookmark].sort((a, b) => a.time - b.time))
    });
  };

  const newVideoLoaded = async () => {
    const bookmarkBtnExists = document.getElementsByClassName("bookmark-btn")[0];

    currentVideoBookmarks = await fetchBookmarks();

    if (!bookmarkBtnExists) {
      const bookmarkBtn = document.createElement("img");

      bookmarkBtn.src = chrome.runtime.getURL("assets/bookmark.png");
      bookmarkBtn.className = "ytp-button " + "bookmark-btn";
      bookmarkBtn.title = "Click to bookmark current timestamp";

      youtubeLeftControls = document.getElementsByClassName("ytp-left-controls")[0];
      youtubePlayer = document.getElementsByClassName('video-stream')[0];

      youtubeLeftControls.appendChild(bookmarkBtn);
      bookmarkBtn.addEventListener("click", addNewBookmarkEventHandler);
    }
  };

  chrome.runtime.onMessage.addListener((obj, sender, response) => {
    const { type, value, videoId } = obj;
    console.log("Message received:", type);
    if (type === "watch") {
      currentVideo = videoId;
      newVideoLoaded();
      addButton();
    } else if (type === "PLAY") {
      youtubePlayer.currentTime = value;
    } else if ( type === "DELETE") {
      currentVideoBookmarks = currentVideoBookmarks.filter((b) => b.time != value);
      chrome.storage.sync.set({ [currentVideo]: JSON.stringify(currentVideoBookmarks) });

      response(currentVideoBookmarks);
    }
    
    let currentType = type;
    if (document.location.href.includes("youtube.com/watch")) {
      currentType = "watch";
    } else if (document.location.href.includes("youtube.com/results")) {
      currentType = "search";
    } else if (document.location.href.includes("youtube.com")) {
      currentType = "NEW";
    }
    
    setTimeout(() => {
      addLikebtn(currentType);
    }, 500);
    addButton();
    
  });  
  function handleURLChange(event) {
    const newURL = window.location.href;
    console.log("URL changed to:", newURL);
    addLikebtn(type);
  }
  
  window.addEventListener("popstate", handleURLChange);

  console.log(document.location.href);
  if (document.location.href.includes("youtube.com/watch")) {
    type = "watch";
    newVideoLoaded();
  } else if (document.location.href.includes("youtube.com/results")) {
    type = "search";
  } else if (document.location.href.includes("youtube.com")) {
    type = "NEW";
  }
  
  setTimeout(() => {
    addLikebtn(type);
  }, 1000);
 
  const addLikebtn = async (type) => {
    let Videos = [];
    if (document.location.href.includes("youtube.com/watch")) {
      type = "watch";
      
    } else if (document.location.href.includes("youtube.com/results")) {
      type = "search";
    } else if (document.location.href.includes("youtube.com")) {
      type = "NEW";
    }
    
    if (type === "NEW") {
      Videos = Array.from(document.getElementsByTagName("ytd-rich-item-renderer"));
    } else if (type === "search") {
      Videos = Array.from(document.getElementsByTagName("ytd-video-renderer"));
    } else if (type === "watch") {
      Videos = Array.from(document.getElementsByTagName("ytd-compact-video-renderer"));
    }

    console.log(`Found ${Videos.length} videos of type: ${type}`);
    
    if (Videos.length === 0) {
      console.log("No videos found to process");
      return;
    }
    
    for (let i = 0; i < Videos.length; i++) {
      try {
        await addLike(Videos[i]);
        await addSub(Videos[i]);
      } catch (error) {
        console.log(`Error processing video ${i}:`, error.message);
      }
    }
  };



  const addLike = async (video) => {
    try {
      if (!video || !video.getElementsByTagName) {
        return;
      }
      
      const anchorTags = video.getElementsByTagName("a");
      if (!anchorTags || anchorTags.length === 0) {
        return;
      }
      
      let linkElement = null;
      let url = null;
      for (let i = 0; i < anchorTags.length; i++) {
        const href = anchorTags[i].href;
        if (href && href.includes("youtube.com/watch")) {
          linkElement = anchorTags[i];
          url = href;
          break;
        }
      }
      
      if (!linkElement || !url) {
        return;
      }
      
      console.log("Processing video URL:", url);
      const likeBtnExists = video.getElementsByClassName("like-btn");
      for (let i = 0; i < likeBtnExists.length; i++) {
        likeBtnExists[i].remove();
      }
      const thumbnailContainers = video.querySelectorAll("ytd-thumbnail, #thumbnail, a[id*='thumbnail']");
      thumbnailContainers.forEach(container => {
        const existingOverlays = container.getElementsByClassName("like-btn");
        for (let i = 0; i < existingOverlays.length; i++) {
          existingOverlays[i].remove();
        }
      });

      let {likes, dislikes} = await getLikes(url);
      console.log("Received likes/dislikes:", likes, dislikes);
      
      if (likes === 0 && dislikes === 0) {
        console.log("No likes/dislikes data available, skipping display");
        return;
      }
      
      likes = formatNumber(likes);
      dislikes = formatNumber(dislikes);
      
      const likeOverlay = document.createElement("div");
      likeOverlay.innerHTML = `❤️ ${likes}`;
      likeOverlay.className = "like-btn";
      likeOverlay.title = `${likes} likes • ${dislikes} dislikes`;
      
      likeOverlay.style.cssText = `
        position: absolute;
        bottom: 8px;
        left: 8px;
        background: linear-gradient(to top, rgba(0, 0, 0, 0.85), rgba(0, 0, 0, 0.6));
        color: white;
        padding: 5px 10px;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 600;
        z-index: 10;
        pointer-events: none;
        font-family: "Roboto", "Arial", sans-serif;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        backdrop-filter: blur(4px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
      `;
      
      let thumbnailContainer = video.querySelector("ytd-thumbnail") ||
                              video.querySelector("#thumbnail") ||
                              video.querySelector("a#thumbnail") ||
                              video.querySelector("a[id*='thumbnail']") ||
                              video.querySelector(".ytd-thumbnail");
      
      if (!thumbnailContainer && linkElement) {
        thumbnailContainer = linkElement.closest("ytd-thumbnail") || 
                            linkElement.closest("#thumbnail");
      }
      
      if (thumbnailContainer) {
        const anchorTag = thumbnailContainer.querySelector("a") || 
                         (thumbnailContainer.tagName === 'A' ? thumbnailContainer : null);
        
        const containerToUse = anchorTag || thumbnailContainer;
        
        const computedStyle = window.getComputedStyle(containerToUse);
        if (computedStyle.position === 'static' || !computedStyle.position) {
          containerToUse.style.position = 'relative';
        }
        
        containerToUse.appendChild(likeOverlay);
        console.log("Successfully added likes overlay to thumbnail:", likes, dislikes);
      } else {
        console.log("Could not find thumbnail container, trying alternative method");
        if (linkElement) {
          const videoLinkParent = linkElement.parentElement;
          if (videoLinkParent) {
            const computedStyle = window.getComputedStyle(videoLinkParent);
            if (computedStyle.position === 'static' || !computedStyle.position) {
              videoLinkParent.style.position = 'relative';
            }
            videoLinkParent.appendChild(likeOverlay);
            console.log("Added likes overlay to video link parent");
          }
        }
      }
    } catch (error) {
      console.log("Error adding likes to video (skipping):", error.message);
    }
  };

 

  const addSub = async (video) => {
    try {
      if (!video || !video.getElementsByTagName) {
        return;
      }
      
      const anchorTags = video.getElementsByTagName("a");
      if (!anchorTags || anchorTags.length === 0) {
        return;
      }
      
      let url = null;
      for (let i = 0; i < anchorTags.length; i++) {
        const href = anchorTags[i].href;
        if (href && href.includes("youtube.com/watch")) {
          url = href;
          break;
        }
      }
      
      if (!url) {
        return;
      }
      
      const subBtnExists = video.getElementsByClassName("sub-btn");

      for (let i = 0; i < subBtnExists.length; i++) {
        subBtnExists[i].remove();
      }

      const { subscriberCount, videoCount } = await getSubs(url);

      const subBtn = document.createElement("pre");
      subBtn.innerHTML = ` ${formatNumber(subscriberCount)} Subs • ${formatNumber(videoCount)} Videos`;
      subBtn.className = "inline-metadata-item style-scope ytd-video-meta-block sub-btn";
      subBtn.title = "Subscriber Count and Video Count";
      subBtn.style.color = "#808080";

      const channelNameArray = video.getElementsByTagName("ytd-channel-name");
      if (channelNameArray && channelNameArray.length > 0) {
        channelNameArray[channelNameArray.length - 1].appendChild(subBtn);
      }
    } catch (error) {
      console.log("Error adding subscriber info to video (skipping):", error.message);
    }
  };
  const getLikes = async (url) => {
    let id = "";
    try {
      const urlObj = new URL(url);
      id = urlObj.searchParams.get("v") || url.split("v=")[1]?.split("&")[0] || url.split("/").pop();
    } catch (e) {
      const match = url.match(/[?&]v=([^&]+)/);
      id = match ? match[1] : url.split("=")[1]?.split("&")[0];
    }
    
    if (!id) {
      console.error("Could not extract video ID from URL:", url);
      return {likes: 0, dislikes: 0};
    }
    
    console.log("Fetching likes for video ID:", id);

    let likes = 0;
    let dislikes = 0;

    try {
      const cacheKey = `likes_${id}`;
      let cacheHit = false;
      
      try {
        const cacheResponse = await caches.match(cacheKey);
        if (cacheResponse) {
          const cacheData = await cacheResponse.json();
          likes = cacheData.likes;
          dislikes = cacheData.dislikes;
          cacheHit = true;
          console.log("Got likes from cache:", likes, dislikes);
        }
      } catch (cacheError) {
        console.log("Cache check failed (this is okay):", cacheError);
      }
      
      if (!cacheHit) {
        let youtubeResponse = await fetch(`https://youtube.googleapis.com/youtube/v3/videos?part=statistics&id=${id}&key=${API_KEY}`);
        let youtubeData = await youtubeResponse.json();
        
        if (youtubeData.error) {
          console.error("YouTube API Error:", youtubeData.error);
        } else if (youtubeData.items && youtubeData.items.length > 0) {
          likes = parseInt(youtubeData.items[0].statistics.likeCount) || 0;
          console.log("Got likes from YouTube API:", likes);
        } else {
          console.log("No items found in YouTube API response");
        }
        
        try {
          let dislikeResponse = await fetch(`https://returnyoutubedislikeapi.com/Votes?videoId=${id}`);
          let dislikeData = await dislikeResponse.json();
          dislikes = dislikeData.dislikes || 0;
        } catch (dislikeError) {
          console.log("Error fetching dislikes: " + dislikeError);
          dislikes = 0;
        }

        try {
          const cacheData = { likes, dislikes };
          const cacheHeaders = { "Content-Type": "application/json" };
          const cacheResponse = new Response(JSON.stringify(cacheData), {
            headers: cacheHeaders,
          });
          await caches.open("api-cache").then((cache) => {
            cache.put(cacheKey, cacheResponse);
          });
        } catch (cacheStoreError) {
          console.log("Failed to store in cache (this is okay):", cacheStoreError);
        }
      }
    } catch (error) {
      console.log("Error fetching likes: " + error);
    }

    return {likes, dislikes};
  };

  const getSubs = async (url) => {
    let id = "";
    try {
      const urlObj = new URL(url);
      id = urlObj.searchParams.get("v") || url.split("v=")[1]?.split("&")[0] || url.split("/").pop();
    } catch (e) {
      const match = url.match(/[?&]v=([^&]+)/);
      id = match ? match[1] : url.split("=")[1]?.split("&")[0];
    }
    
    if (!id) {
      console.error("Could not extract video ID from URL:", url);
      return { subscriberCount: 0, videoCount: 0 };
    }
    
    let channelId = "";

    try {
      const cacheKey = `channelId_${id}`;
      let cacheHit = false;
      
      try {
        const cacheResponse = await caches.match(cacheKey);
        if (cacheResponse) {
          const cacheData = await cacheResponse.json();
          channelId = cacheData.channelId;
          cacheHit = true;
        }
      } catch (cacheError) {
        console.log("Cache check failed (this is okay):", cacheError);
      }
      
      if (!cacheHit) {
        let response = await fetch(`https://youtube.googleapis.com/youtube/v3/videos?part=snippet&id=${id}&key=${API_KEY}`);
        let data = await response.json();
        
        if (data.error) {
          console.error("YouTube API Error (channel ID):", data.error);
        } else if (data.items && data.items.length > 0) {
          channelId = data.items[0].snippet.channelId;
        }

        if (channelId) {
          try {
            const cacheData = { channelId };
            const cacheHeaders = { "Content-Type": "application/json" };
            const cacheResponse = new Response(JSON.stringify(cacheData), {
              headers: cacheHeaders,
            });
            await caches.open("api-cache").then((cache) => {
              cache.put(cacheKey, cacheResponse);
            });
          } catch (cacheStoreError) {
            console.log("Failed to store in cache (this is okay):", cacheStoreError);
          }
        }
      }
    } catch (error) {
      console.log("Error fetching channel ID: " + error);
    }

    let subscriberCount = 0;
    let videoCount = 0;

    if (!channelId) {
      console.log("No channelId available, skipping subscriber stats");
      return { subscriberCount: 0, videoCount: 0 };
    }
    
    try {
      const cacheKey = `channelStats_${channelId}`;
      let cacheHit = false;
      
      try {
        const cacheResponse = await caches.match(cacheKey);
        if (cacheResponse) {
          const cacheData = await cacheResponse.json();
          subscriberCount = cacheData.subscriberCount;
          videoCount = cacheData.videoCount;
          cacheHit = true;
        }
      } catch (cacheError) {
        console.log("Cache check failed (this is okay):", cacheError);
      }
      
      if (!cacheHit) {
        let response = await fetch(`https://youtube.googleapis.com/youtube/v3/channels?part=statistics&id=${channelId}&key=${API_KEY}`);
        let data = await response.json();
        
        if (data.error) {
          console.error("YouTube API Error (channel stats):", data.error);
        } else if (data.items && data.items.length > 0) {
          subscriberCount = data.items[0].statistics.subscriberCount;
          videoCount = data.items[0].statistics.videoCount;
        }

        if (subscriberCount || videoCount) {
          try {
            const cacheData = { subscriberCount, videoCount };
            const cacheHeaders = { "Content-Type": "application/json" };
            const cacheResponse = new Response(JSON.stringify(cacheData), {
              headers: cacheHeaders,
            });
            await caches.open("api-cache").then((cache) => {
              cache.put(cacheKey, cacheResponse);
            });
          } catch (cacheStoreError) {
            console.log("Failed to store in cache (this is okay):", cacheStoreError);
          }
        }
      }
    } catch (error) {
      console.log("Error fetching channel statistics: " + error);
    }

    return { subscriberCount: formatNumber(subscriberCount), videoCount };
  };


  function formatNumber(num) {
    if (!num || isNaN(num)) {
      return 0;
    }
    num = parseInt(num) || 0;
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    } else {
      return num.toString();
    }
  }

  
  function processElement(element) {
    addLike(element);
    addSub(element);
  }
  
  const targetNode = document.body;
  
  const observerOptions = { childList: true,subtree: true };
  
  const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      if (mutation.type === "childList") {
        mutation.addedNodes.forEach((addedNode) => {
          if (addedNode.tagName && (addedNode.tagName.toLowerCase() === "ytd-rich-item-renderer"||addedNode.tagName.toLowerCase() === "ytd-compact-video-renderer"||addedNode.tagName.toLowerCase() === "ytd-video-renderer")) {
            console.log("found");
            processElement(addedNode);
          }
        });
      }
    }
  });
  
  observer.observe(targetNode, observerOptions);

})();
