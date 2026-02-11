let map, marker;

function showSection(id) {
  document.querySelectorAll(".section").forEach(s =>
    s.classList.add("hidden")
  );
  document.getElementById(id).classList.remove("hidden");
}

function initMap(lat, lng) {
  map = L.map("map").setView([lat, lng], 16);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors"
  }).addTo(map);

  marker = L.marker([lat, lng]).addTo(map);
}

function updateDashboard() {
  // Try to get browser location first
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      function(position) {
        const currentLat = position.coords.latitude;
        const currentLng = position.coords.longitude;

        if (!map) {
          initMap(currentLat, currentLng);
        } else {
          marker.setLatLng([currentLat, currentLng]);
          map.setView([currentLat, currentLng]);
        }

        // Show lat/lng in status
        fetch("/sensor_status")
          .then(res => res.json())
          .then(data => {
            document.getElementById("status").innerText =
              `Lat: ${currentLat.toFixed(6)}, Lng: ${currentLng.toFixed(6)}, Status: ${data.status}`;
            document.getElementById("alertBox").style.display =
              data.status === "ALERT" ? "block" : "none";
          });
      },
      function(error) {
        console.warn("Geolocation failed:", error.message);

        // fallback to server location
        fetch("/get_location")
          .then(res => res.json())
          .then(loc => {
            if (!map) initMap(loc.lat, loc.lng);
            else {
              marker.setLatLng([loc.lat, loc.lng]);
              map.setView([loc.lat, loc.lng]);
            }

            fetch("/sensor_status")
              .then(res => res.json())
              .then(data => {
                document.getElementById("status").innerText =
                  `Lat: ${loc.lat.toFixed(6)}, Lng: ${loc.lng.toFixed(6)}, Status: ${data.status}`;
                document.getElementById("alertBox").style.display =
                  data.status === "ALERT" ? "block" : "none";
              });
          });
      }
    );
  } else {
    console.warn("Geolocation not supported, using server location");
    fetch("/get_location")
      .then(res => res.json())
      .then(loc => {
        if (!map) initMap(loc.lat, loc.lng);
        else {
          marker.setLatLng([loc.lat, loc.lng]);
          map.setView([loc.lat, loc.lng]);
        }
      });
  }

  // Media update stays the same
  fetch("/media")
    .then(res => res.json())
    .then(m => {
      // IMAGES
      document.getElementById("images").innerHTML =
        m.images.map(i => `
          <div class="media-box">
            <img src="${i}">
            <br>
            <a href="${i}" download>
              <button>⬇️ Download</button>
            </a>
            <button onclick="deleteImage('${i}')">🗑️ Delete</button>
          </div>
        `).join("");

      // VIDEOS
      document.getElementById("videos").innerHTML =
        m.videos.map(v => `
          <div class="media-box">
            <video src="${v}" controls></video>
            <br>
            <a href="${v}" download>
              <button>⬇️ Download</button>
            </a>
            <button onclick="deleteVideo('${v}')">🗑️ Delete</button>
          </div>
        `).join("");
    });
}


function simulateMove() {
  fetch("/simulate_move");
}

function simulateTheft() {
  fetch("/simulate_theft");
}

setInterval(updateDashboard, 3000);

function deleteImage(url) {
  if (!confirm("Remove this image from dashboard?")) return;

  fetch("/delete_image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url })
  }).then(() => updateDashboard());
}

function deleteVideo(url) {
  if (!confirm("Remove this video from dashboard?")) return;

  fetch("/delete_video", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url })
  }).then(() => updateDashboard());
}

