// Applique la police Georgia à tous les éléments du widget après son chargement
document.addEventListener("DOMContentLoaded", function () {
    setTimeout(function () {
        const widgetElements = document.querySelectorAll(
            ".sc-status-widget *",
        );
        widgetElements.forEach(function (element) {
            element.style.fontFamily = "Georgia, serif";
        });
    }, 500);

    // Gestion du sélecteur de station
    const stationButtons = document.querySelectorAll(".station-btn");
    const playButton = document.getElementById("playButton");
    const radioStream = document.getElementById("radioStream");
    const streamSource = document.getElementById("streamSource");
    let statusWidgetCorse = document.getElementById("statusWidgetCorse");
    let statusWidgetCotedazur = document.getElementById(
        "statusWidgetCotedazur",
    );
    let statusWidgetCorseTemplate = statusWidgetCorse
        ? statusWidgetCorse.outerHTML
        : null;
    let statusWidgetCotedazurTemplate = statusWidgetCotedazur
        ? statusWidgetCotedazur.outerHTML
        : null;

    function captureTemplates() {
        statusWidgetCorse =
            document.getElementById("statusWidgetCorse") || statusWidgetCorse;
        statusWidgetCotedazur =
            document.getElementById("statusWidgetCotedazur") ||
            statusWidgetCotedazur;
        if (!statusWidgetCorseTemplate && statusWidgetCorse) {
            statusWidgetCorseTemplate = statusWidgetCorse.outerHTML;
        }
        if (!statusWidgetCotedazurTemplate && statusWidgetCotedazur) {
            statusWidgetCotedazurTemplate = statusWidgetCotedazur.outerHTML;
        }
    }

    captureTemplates();

    // playback state variables (declared early so they are safe to reference)
    let isPlaying = false;
    let currentStation = null;
    let currentStationUrl = null;
    let hasChosenStation = false;
    let pendingPlayAfterChoice = false;

    // if this page only contains a single station widget (no selector)
    // automatically select that station so the correct stream URL is
    // prepared and the widget is shown.  This covers the dedicated
    // "player-corse.html" and "player-cotedazur.html" scenarios.
    //
    // We can't rely on the station buttons because those pages don't
    // include them.  Instead we inspect which widget element is present.
    (function autoSelectDedicatedStation() {
        const hasCorseWidget = !!statusWidgetCorse;
        const hasCotedazurWidget = !!statusWidgetCotedazur;
        let station = null;
        let url = null;

        if (hasCorseWidget && !hasCotedazurWidget) {
            station = "corse";
            url = "https://manager11.streamradio.fr:1435/stream";
        } else if (hasCotedazurWidget && !hasCorseWidget) {
            station = "cotedazur";
            url = "https://manager11.streamradio.fr:1445/stream";
        }

        if (station) {
            // mark as chosen so the play button won't open the modal
            currentStation = station;
            hasChosenStation = true;
            currentStationUrl = url;
            streamSource.setAttribute("src", url);
            radioStream.load();
            showWidgetForStation(station);
        }
    })();

    const stationModalOverlay = document.getElementById(
        "stationModalOverlay",
    );
    const stationModalButtons = document.querySelectorAll(
        "#stationModalOverlay .modal-btn",
    );

    function stopPlaybackIfNeeded() {
        if (!isPlaying) return;
        radioStream.pause();
        radioStream.currentTime = 0;
        playButton.innerHTML =
            '<i class="fa-solid fa-play" style="margin-right: 8px;"></i> PLAY';
        playButton.classList.remove("playing");
        isPlaying = false;
    }

    function showWidgetForStation(station) {
        // gracefully handle pages where only one of the widgets exists
        if (!station) {
            if (statusWidgetCorse) statusWidgetCorse.style.display = "none";
            if (statusWidgetCotedazur) statusWidgetCotedazur.style.display = "none";
            return;
        }
        const isCorse = station === "corse";
        if (statusWidgetCorse)
            statusWidgetCorse.style.display = isCorse ? "" : "none";
        if (statusWidgetCotedazur)
            statusWidgetCotedazur.style.display = isCorse ? "none" : "";
    }

    function widgetIsProbablyGone(widgetEl) {
        if (!widgetEl || !widgetEl.parentNode) return true;
        const style = window.getComputedStyle(widgetEl);
        if (style.display === "none" || style.visibility === "hidden")
            return true;
        const rect = widgetEl.getBoundingClientRect();
        return rect.height < 20 || rect.width < 20;
    }

    function recreateWidget(station) {
        try {
            const container = document.querySelector(".sc-status-widget");
            if (!container) return;
            const template =
                station === "corse"
                    ? statusWidgetCorseTemplate
                    : statusWidgetCotedazurTemplate;
            if (!template) return;

            const oldEl =
                station === "corse" ? statusWidgetCorse : statusWidgetCotedazur;
            if (!oldEl || !oldEl.parentNode) return;

            const tmp = document.createElement("div");
            tmp.innerHTML = template;
            const freshEl = tmp.firstElementChild;
            if (!freshEl) return;

            oldEl.parentNode.replaceChild(freshEl, oldEl);
            if (station === "corse") {
                statusWidgetCorse = freshEl;
            } else {
                statusWidgetCotedazur = freshEl;
            }
            showWidgetForStation(hasChosenStation ? currentStation : "corse");
        } catch (e) {
            console.error("Error recreating widget:", e);
        }
    }

    function setStation(station, stationUrl) {
        if (!station) return;
        currentStation = station;
        hasChosenStation = true;
        if (stationUrl) currentStationUrl = stationUrl;

        // UI active (si on retrouve le bouton correspondant)
        stationButtons.forEach((btn) => {
            btn.classList.toggle("active", btn.dataset.station === station);
        });

        if (stationUrl) {
            streamSource.setAttribute("src", stationUrl);
            radioStream.load();
        }

        showWidgetForStation(currentStation);
        stopPlaybackIfNeeded();
    }

    function hasStreamSource() {
        const srcAttr = streamSource.getAttribute("src");
        return !!(srcAttr && srcAttr.trim());
    }

    function unloadStream() {
        try {
            radioStream.pause();
        } catch (_) {
            // no-op
        }
        radioStream.currentTime = 0;
        streamSource.removeAttribute("src");
        radioStream.load();
    }

    function openStationModal() {
        if (!stationModalOverlay) return;
        stationModalOverlay.style.display = "flex";
    }

    function closeStationModal() {
        if (!stationModalOverlay) return;
        stationModalOverlay.style.display = "none";
    }

    function resetStream() {
        try {
            radioStream.pause();
            radioStream.currentTime = 0;
            radioStream.removeAttribute("src");
            radioStream.load();
        } catch (e) {
            console.error("Error resetting stream:", e);
        }
    }

    function startPlayback() {
        resetStream(); // Ensure the stream is fully reset before playing
        if (!hasStreamSource() && currentStationUrl) {
            streamSource.setAttribute("src", currentStationUrl);
            radioStream.load();
        }
        if (!hasStreamSource()) return;
        radioStream.play();
        playButton.innerHTML =
            '<i class="fa-solid fa-stop" style="margin-right: 8px;"></i> STOP';
        playButton.classList.add("playing");
        isPlaying = true;
    }

    // Gestion des boutons de sélection de station
    stationButtons.forEach((button) => {
        button.addEventListener("click", function () {
            setStation(this.dataset.station, this.dataset.url);
            startPlayback();
        });
    });

    const initialStationToShow = hasChosenStation
        ? currentStation
        : statusWidgetCorse
          ? "corse"
          : statusWidgetCotedazur
            ? "cotedazur"
            : null;

    showWidgetForStation(initialStationToShow);

    streamSource.removeAttribute("src");

    setInterval(() => {
        captureTemplates();
        const stationToShow = hasChosenStation ? currentStation : "corse";
        showWidgetForStation(stationToShow);
        const targetWidget =
            stationToShow === "corse"
                ? statusWidgetCorse
                : statusWidgetCotedazur;
        if (widgetIsProbablyGone(targetWidget)) {
            recreateWidget(stationToShow);
        }
    }, 10000);

    // Gestion du bouton Play/Stop
    playButton.addEventListener("click", function () {
        if (isPlaying) {
            resetStream();
            playButton.innerHTML =
                '<i class="fa-solid fa-play" style="margin-right: 8px;"></i> PLAY';
            playButton.classList.remove("playing");
            isPlaying = false;
        } else {
            if (!hasChosenStation) {
                pendingPlayAfterChoice = true;
                openStationModal();
                return;
            }
            startPlayback();
        }
    });

    // Modal: sélection obligatoire (au premier Play si pas de station)
    stationModalButtons.forEach((button) => {
        button.addEventListener("click", function () {
            const station = this.dataset.station;
            const url = this.dataset.url;
            setStation(station, url);
            closeStationModal();
            if (pendingPlayAfterChoice) {
                pendingPlayAfterChoice = false;
                startPlayback();
            }
        });
    });

    // Gestion de la fin du stream
    radioStream.addEventListener("ended", function () {
        unloadStream();
        playButton.innerHTML =
            '<i class="fa-solid fa-play" style="margin-right: 8px;"></i> PLAY';
        playButton.classList.remove("playing");
        isPlaying = false;
    });

    // Gestion des erreurs
    radioStream.addEventListener("error", function () {
        alert("Erreur lors du chargement du flux radio.");
        unloadStream();
        playButton.innerHTML =
            '<i class="fa-solid fa-play" style="margin-right: 8px;"></i> PLAY';
        playButton.classList.remove("playing");
        isPlaying = false;
    });
});