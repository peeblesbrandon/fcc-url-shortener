// client-side js, loaded by index.html
// run by the browser each time the page is loaded

console.log("hello world :o");

// define variables that reference elements on our page
const resContainer = document.getElementById("resContainer");
const resURL = document.getElementById("resURL");
const originalURL = document.getElementById("originalURL");
const urlForm = document.getElementById("urlForm");

// helper function to display shortened and original link
function displayResponse(json) {
  originalURL.innerText = json.original_url;
  originalURL.href = json.original_url;
  resURL.innerText = 'https://url-bsp.glitch.me/api/shorturl/' + json.short_url;
  resURL.href = 'https://url-bsp.glitch.me/api/shorturl/' + json.short_url;
  resContainer.style.display = 'block';
}

urlForm.addEventListener("submit", event => {
  fetch("/api/shorturl/new", {
    method: 'POST',
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ inputURL: urlForm.inputURL.value })
  })
    .then(response => response.json())
    .then(data => {
      // if error, hide response div and raise alert
      if ('error' in data) {
        resContainer.style.display = 'none';
        alert("Error: " + data.error);
      } else {
        displayResponse(data);
      }

      // reset form 
      urlForm.reset();
      urlForm.elements.inputURL.focus();
      
  });
  
  event.preventDefault(); //stop from refreshing page
});

