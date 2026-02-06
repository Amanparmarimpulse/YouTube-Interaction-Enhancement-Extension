(()=>{
    let youtubeLeftControls, youtubePlayer;
    let currentVideo = "";
    let currentVideoBookmarks = [];
    
    
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
  
      if (type === "watch") {
        currentVideo = videoId;
        newVideoLoaded();
      } else if (type === "PLAY") {
        youtubePlayer.currentTime = value;
      } else if ( type === "DELETE") {
        currentVideoBookmarks = currentVideoBookmarks.filter((b) => b.time != value);
        chrome.storage.sync.set({ [currentVideo]: JSON.stringify(currentVideoBookmarks) });
  
        response(currentVideoBookmarks);
        
      }


      addLikebtn(type);
    });
  
    

    console.log(document.location.href);
    if (document.location.href.includes("youtube.com/watch")){
        type = "watch";
        newVideoLoaded();
    }
    else if (document.location.href.includes("youtube.com/results")){
        type = "search";
    }
    else if (document.location.href.includes("youtube.com")){
        type = "NEW";
    }
    const addLikebtn = async (type) => {
      let Videos;
      if (type === "NEW") {
        Videos = document.getElementsByTagName("ytd-rich-item-renderer");
      } else if (type === "search") {
        Videos = document.getElementsByTagName("ytd-video-renderer");
      } else if (type === "watch") {
        Videos = document.getElementsByTagName("ytd-compact-video-renderer");
      }
      console.log(Videos);
    
      let VideosId = [];
      for (let i = 0; i < Videos.length; i++) {
        VideosId.push(getId(Videos[i]));
      }
    
      let fetchApiString = 'https://youtube.googleapis.com/youtube/v3/videos?part=statistics&part=snippet';
    
      for (let i = 0; i < Videos.length; i++) {
        fetchApiString += "&id=" + VideosId[i];
      }
      fetchApiString += "&key=AIzaSyCjNvVmGkFEKl_fzvjefzY-o51tD9eLJ_8"; // Replace with your actual API key
    
      let data = await fetch(fetchApiString).then((response) => response.json());
    
      let channelIds = [];
      for (let i = 0; i < data.items.length; i++) {
        channelIds.push(data.items[i].snippet.channelId);
      }
    
      let fetchForSubs = "https://youtube.googleapis.com/youtube/v3/channels?part=statistics";
    
      for (let i = 0; i < channelIds.length; i++) {
        fetchForSubs += "&id=" + channelIds[i];
      }
      fetchForSubs += "&key=AIzaSyCjNvVmGkFEKl_fzvjefzY-o51tD9eLJ_8"; // Replace with your actual API key
    
      let dataSubs = await fetch(fetchForSubs).then((response) => response.json());
      
      let videoDataSubs = dataSubs.items.map((x) => {
        return {
          subscriberCount: x.statistics.subscriberCount,
          videoCount: x.statistics.videoCount,
        };
      });
    
      for (let i = 0; i < Videos.length; i++) {
        addLike(Videos[i], data.items[i].statistics.likeCount);
        addSub(Videos[i], videoDataSubs[i]);
      }
    };
    
    const getId = (video) => {
      let url = video.getElementsByTagName("a")[0].href;
      let id = url.split("=")[1];
      return id;
    };
    

    const addLike = async (video, likes )=>{
        
        let url = video.getElementsByTagName("a")[0].href;
        
      

        const likeBtnExists = video.getElementsByClassName("like-btn")[0];
        

        if (!likeBtnExists) {
            const likeBtn = document.createElement("span");
            likeBtn.innerHTML = likes+" "+"likes";
            likeBtn.className = "inline-metadata-item style-scope ytd-video-meta-block like-btn";
            likeBtn.title = "No. of likes in this Video";
            
            video.getElementsByClassName("style-scope ytd-video-meta-block")[0].getElementsByClassName("style-scope ytd-video-meta-block")[4].append(likeBtn)

            
            
        }
    }

    const getLikes = async (url) =>{
        let likes;
            //use api to get likes
            let id = url.split("=")[1];
        console.log(id);
            let sig = await fetch("https://youtube.googleapis.com/youtube/v3/videos?part=statistics&id="+id+"&key=AIzaSyCjNvVmGkFEKl_fzvjefzY-o51tD9eLJ_8").then(data=>{
      return data.json();}).catch(err=>{console.log("error"+id+" "+err);});

        likes = sig["items"][0]["statistics"]["likeCount"];
        
        return formatNumber(likes);    
    }

    const addSub = async (video, dataSub)=>{
        
      let url = video.getElementsByTagName("a")[0].href;
      

      const subBtnExists = video.getElementsByClassName("sub-btn")[0];
      
      
      const {subscriberCount, videoCount} = dataSub;

      if (!subBtnExists) {
          const subBtn = document.createElement("pre");
          subBtn.innerHTML = " " + subscriberCount+" "+" Subs"+" • "+videoCount+" Videos";
          subBtn.className = "inline-metadata-item style-scope ytd-video-meta-block style-scope ytd-channel-name sub-btn";
          subBtn.title = "Subscriber Count and Video Count";
          subBtn.style = "color:#808080";
          
          const array = video.getElementsByTagName("ytd-channel-name");
          array[array.length-1].append(subBtn);
          
      }
  }

  const getSubs = async (url) =>{
      let channelId;
          //use api to get likes
          let id = url.split("=")[1];
      
          let sig = await fetch("https://youtube.googleapis.com/youtube/v3/videos?part=snippet&id="+id+"&key=AIzaSyCjNvVmGkFEKl_fzvjefzY-o51tD9eLJ_8").then(data=>{
    return data.json();});
      channelId = sig["items"][0]["snippet"]["channelId"];
          let res = await fetch("https://youtube.googleapis.com/youtube/v3/channels?part=statistics&id="+channelId+"&key=AIzaSyCjNvVmGkFEKl_fzvjefzY-o51tD9eLJ_8").then(data=>{
            return data.json();});
        let subscriberCount = res["items"][0]["statistics"]["subscriberCount"];
        let videoCount = res["items"][0]["statistics"]["videoCount"];
        console.log(videoCount);
      return {subscriberCount: formatNumber(subscriberCount) , videoCount};    
  }

    function formatNumber(num) {
        if (num >= 1000000) {
          return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
          return (num / 1000).toFixed(1) + 'K';
        } else {
          return num.toString();
        }
      }
      

    addLikebtn(type);
    
    
})();