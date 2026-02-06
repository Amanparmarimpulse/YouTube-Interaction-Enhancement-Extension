chrome.tabs.onUpdated.addListener((tabId, tab) => {
  if (tab.url && tab.url.includes("youtube.com/results")) {
    const queryParameters = "hi";
    chrome.tabs.sendMessage(tabId, {
      type: "search",
      videoId: "some"
      
    });
  }
  else if (tab.url && tab.url.includes("youtube.com/watch")) {
    const queryParameters = tab.url.split("?")[1];
    const urlParameters = new URLSearchParams(queryParameters);

    chrome.tabs.sendMessage(tabId, {
      type: "watch",
      videoId: urlParameters.get("v"),
    });
  }
    else if (tab.url && tab.url.includes("youtube.com")) {
      const queryParameters = "hi";
      
      chrome.tabs.sendMessage(tabId, {
        type: "NEW",
        videoId: "some"
        
      });
    }
  });


  