"use strict";

{
  let initCalled;
  const callbackPromise = new Promise((r) => (window.__initHereMap = r));

  function loadHereMaps() {
    if (!initCalled) {
      const script = document.createElement("script");
      script.src = "https://js.api.here.com/v3/3.1/mapsjs.bundle.js";
      script.setAttribute("type", "module");
      script.onload = () => {
        window.__initHereMap();
      };
      document.head.appendChild(script);

      const mapCss = document.createElement("link");
      mapCss.rel = "stylesheet";
      mapCss.href = "http://js.api.here.com/v3/3.1/mapsjs-ui.css";
      document.getElementsByTagName("head")[0].appendChild(mapCss);

      initCalled = true;
    }
    return callbackPromise;
  }

  customElements.define(
    "here-map",
    class extends HTMLElement {
      static get observedAttributes() {
        return ["api-key", "zoom", "latitude", "longitude", "map-options"];
      }

      attributeChangedCallback(name, oldVal, val) {
        switch (name) {
          case "api-key":
            this.apiKey = val;
            break;
          case "zoom":
            this.zoom = parseFloat(val);
            if (this.map) {
              this.map.setZoom(this.zoom);
            }
          case "latitude":
          case "longitude":
            this[name] = parseFloat(val);
            if (this.map) {
              this.map.setCenter({
                lat: this.latitude,
                lng: this.longitude,
              });
            }
            break;
          case "map-options":
            this.mapOptions = JSON.parse(val);
            break;
        }
      }

      constructor() {
        super();

        this.map = null;
        this.apiKey = null;
        this.zoom = null;
        this.latitude = null;
        this.longitude = null;
        this.mapOptions = {};
      }

      connectedCallback() {
        loadHereMaps().then(() => {
          if (!this.mapOptions.zoom) {
            this.mapOptions.zoom = this.zoom || 4;
          }
          if (!this.mapOptions.center) {
            this.mapOptions.center = {
              lat: this.latitude || 0,
              lng: this.longitude || 0,
            };
          }

          // Boilerplate to show a map with standard behaviour
          const platform = new H.service.Platform({ apiKey: this.apiKey });
          const defaultLayers = platform.createDefaultLayers();
          this.map = new H.Map(
            this,
            defaultLayers.vector.normal.map,
            this.mapOptions
          );
          const events = new H.mapevents.MapEvents(this.map);
          new H.mapevents.Behavior(events);
          this.addEvents();
          H.ui.UI.createDefault(this.map, defaultLayers);

          // Add Markers (if any)
          this.markerLayer = this.createGroup();
          this.querySelectorAll("here-map-marker").forEach(this.createMarker);

          // Finally, announce the map is ready
          this.dispatchEvent(
            new CustomEvent("here-map-ready", { detail: this.map })
          );
        });
      }

      // Catch and dispatch any relevant map events
      addEvents() {
        this.map.addEventListener("tap", (evt) => {
          if (!(evt.target instanceof H.Map)) {
            return;
          }

          const coord = this.map.screenToGeo(
            evt.currentPointer.viewportX,
            evt.currentPointer.viewportY
          );

          this.dispatchEvent(
            new CustomEvent("here-map-tap", { detail: coord })
          );
        });
      }

      createGroup = () => {
        const group = new H.map.Group();
        this.map.addObject(group);
        return group;
      };

      createMarker = (markerElement) => {
        const markerOptions = {};
        if (markerElement.markerOptions.icon) {
          markerOptions.icon = new H.map.Icon(markerElement.markerOptions.icon);
        }
        const marker = new H.map.Marker(markerElement.position, markerOptions);
        this.markerLayer.addObject(marker);
        marker.addEventListener("tap", (evt) => {
          this.dispatchEvent(
            new CustomEvent("here-marker-tap", {
              detail: markerElement.position,
            })
          );
        });
        markerElement.addEventListener("here-marker-updated", () => {
          marker.setGeometry(markerElement.position);
        });
      };

    }
  );
  // layers.markers.removeAll();
  // if (!markers) {
    // return;
  // }

  customElements.define(
    "here-map-marker",
    class extends HTMLElement {
      static get observedAttributes() {
        return ["latitude", "longitude", "icon"];
      }

      attributeChangedCallback(name, oldVal, val) {
        switch (name) {
          case "latitude":
          case "longitude":

          this[name] = parseFloat(val);
            this.position = {
              lat: this.latitude || 0,
              lng: this.longitude || 0,
            };

            this.dispatchEvent(
              new CustomEvent("here-marker-updated", {
                detail: this.position,
                composed: true,
              })
            );
            break;
          case "icon":
            this.markerOptions.icon = val;
            break;
        }
      }

      constructor() {
        super();

        this.latitude = null;
        this.longitude = null;
        this.position = {};
        this.markerOptions = {};
      }

      connectedCallback() {
        this.position = {
          lat: this.latitude || 0,
          lng: this.longitude || 0,
        };
      }
    }
  );
}
