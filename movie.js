// ======== movie.js FINAL FIX (TRAILER & SINOPSIS BERFUNGSI) ========

// Elemen target di halaman movie.html
const mEls = {
  poster: document.getElementById("moviePoster"),
  title: document.getElementById("movieTitle"),
  director: document.getElementById("movieDirector"),
  casts: document.getElementById("movieCasts"),
  duration: document.getElementById("movieDuration"),
  rating: document.getElementById("movieRating"),
  genres: document.getElementById("movieGenres"),
  ratingBadge: document.getElementById("movieRatingBadge"),
  trailerFrame: document.getElementById("movieTrailerFrame"),
  externalLink: document.getElementById("movieExternalLink"),
  synopsis: document.getElementById("movieSynopsis"),
  dateInfo: document.getElementById("movieDateInfo"),
};

// Ambil ID dari URL ?movie=
function getMovieIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return decodeURIComponent(params.get("movie") || "").trim();
}

// Ekstrak YouTube video ID dari berbagai format URL
function extractYoutubeId(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.replace("/", "");
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      if (u.pathname.startsWith("/embed/")) {
        return u.pathname.replace("/embed/", "");
      }
    }
  } catch {
    return null;
  }
  return null;
}


// Ambil sinopsis dari Wikipedia (opsional)
async function loadWikipediaSynopsis(slug) {
  if (!slug) return;
  try {
    const apiUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(
      `https://id.wikipedia.org/api/rest_v1/page/summary/${slug}`
    )}`;
    const res = await fetch(apiUrl);
    const data = await res.json();
    const parsed = JSON.parse(data.contents);
    if (parsed.extract) {
      mEls.synopsis.innerHTML = `<p>${parsed.extract}</p><p class="wiki-source">Sumber: <a href="https://id.wikipedia.org/wiki/${slug}" target="_blank">Wikipedia</a></p>`;
    }
  } catch (err) {
    console.warn("Gagal load Wikipedia:", err);
  }
}

// Load data dari data.json
async function loadMovieDetail() {
  const movieId = getMovieIdFromUrl();
  if (!movieId) {
    mEls.synopsis.textContent = "ID film tidak ditemukan di URL.";
    return;
  }

  try {
    const res = await fetch("data.json");
    const data = await res.json();
    const cinemas = data.cinemas || [];

    let foundMovie = null;
    let playingCinemaNames = [];

    cinemas.forEach((c) => {
      (c.movies || []).forEach((m) => {
        const mId = decodeURIComponent(m.id || "").trim().toLowerCase();
        const target = movieId.toLowerCase();
        if (mId === target || mId.endsWith("/" + target)) {
          foundMovie = m;
          playingCinemaNames.push(c.name || "Bioskop");
        }
      });
    });

    if (!foundMovie) {
      mEls.synopsis.textContent =
        "Film tidak ditemukan di data.json. Pastikan ID benar.";
      return;
    }

console.log("URL movieId dari query:", movieId);
console.log("Film ditemukan:", foundMovie ? foundMovie.title : "TIDAK DITEMUKAN");
console.log("Trailer dari data.json:", foundMovie ? foundMovie.trailerUrl : "TIDAK ADA");
console.log("Keys dari foundMovie:", Object.keys(foundMovie));

    renderMovie(foundMovie, playingCinemaNames);
  } catch (err) {
    console.error("Gagal memuat data.json:", err);
    mEls.synopsis.textContent = "Terjadi kesalahan memuat data.json.";
  }
}

// Render data film ke halaman
function renderMovie(movie, cinemaNames) {
  // ========== INFO DASAR ==========
  mEls.title.textContent = movie.title || "Judul Film Tidak Dikenal";
  mEls.director.textContent = movie.director || "-";
  mEls.casts.textContent = movie.casts || "-";
  mEls.duration.textContent = movie.durationMinutes
    ? `${movie.durationMinutes} minutes`
    : "-";
  mEls.rating.textContent = movie.ageRating || "NR";
  mEls.genres.textContent =
    movie.genres && movie.genres.length ? movie.genres.join(", ") : "-";

  // ========== BADGE RATING ==========
  const age = (movie.ageRating || "").toString();
  mEls.ratingBadge.textContent = age || "NR";
  mEls.ratingBadge.className = "movie-rating-badge";
  if (age === "SU") mEls.ratingBadge.classList.add("movie-rating-SU");
  if (age === "13+") mEls.ratingBadge.classList.add("movie-rating-13");
  if (age === "17+") mEls.ratingBadge.classList.add("movie-rating-17");
  if (age === "21+") mEls.ratingBadge.classList.add("movie-rating-21");

  // ========== POSTER ==========
  if (movie.posterUrl)
    mEls.poster.style.backgroundImage = `url("${movie.posterUrl}")`;

  // ========== TRAILER (PREVIEW GAMBAR + LINK) ==========
  console.log("Trailer URL (raw):", movie.trailerUrl);

  // kosongkan kontainer trailer
  mEls.trailerFrame.innerHTML = "";

  if (movie.trailerUrl && movie.trailerUrl.trim() !== "") {
    // pilih gambar untuk preview (poster > heroBg > fallback)
    const thumbSrc =
      movie.heroBgUrl ||
      movie.posterUrl ||
      "assets/movies/hero-placeholder.jpg";

    const thumb = document.createElement("div");
    thumb.className = "movie-trailer-thumb";
    thumb.style.backgroundImage = `url("${thumbSrc}")`;

    // klik => buka YouTube di tab baru
    thumb.addEventListener("click", () => {
      window.open(movie.trailerUrl, "_blank", "noopener,noreferrer");
    });

    mEls.trailerFrame.appendChild(thumb);

    const hint = document.createElement("p");
    hint.className = "movie-trailer-hint";
    hint.textContent = "Klik gambar untuk menonton trailer di YouTube.";
    mEls.trailerFrame.appendChild(hint);
  } else {
    // kalau nggak ada trailernya sama sekali
    mEls.trailerFrame.innerHTML = `
      <div class="movie-trailer-empty">
        Trailer belum tersedia di <code>data.json</code>.
      </div>
    `;
  }

  // ========== SINOPSIS ==========
  if (movie.synopsisText && movie.synopsisText.trim() !== "") {
    const paragraphs = movie.synopsisText
      .split(/\n+/)
      .map((p) => `<p>${p.trim()}</p>`)
      .join("");
    mEls.synopsis.innerHTML = paragraphs;
  } else if (movie.sinopsisUrl?.includes("wikipedia.org")) {
    const slug = movie.sinopsisUrl.split("/wiki/")[1];
    mEls.synopsis.textContent = "Memuat sinopsis dari Wikipedia...";
    loadWikipediaSynopsis(slug);
  } else {
    mEls.synopsis.textContent =
      "Sinopsis belum tersedia. Tambahkan field synopsisText di data.json.";
  }

  // ========== INFO BIOSKOP & TANGGAL ==========
  if (movie.playStart || movie.playEnd) {
    const start = movie.playStart || "?";
    const end = movie.playEnd || "?";
    mEls.dateInfo.textContent = `Film ini tayang di beberapa bioskop: ${cinemaNames.join(
      ", "
    )} sejak ${start}${movie.playEnd ? ` sampai ${end}` : ""}.`;
  } else {
    mEls.dateInfo.textContent = `Film ini terdaftar tayang di: ${cinemaNames.join(
      ", "
    )}. Jadwal mengikuti info resmi bioskop.`;
  }
}

// Jalankan saat halaman siap
loadMovieDetail();