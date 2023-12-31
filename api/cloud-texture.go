package handler

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"time"

	"github.com/amsokol/go-grib2"
)

func Handler(w http.ResponseWriter, r *http.Request) {
	defer func() {
		if r := recover(); r != nil {
			log.Println("Recovered from panic:", r)
			http.Error(w, "Server error", http.StatusInternalServerError)
		}
	}()

	params := r.URL.Query()
	level := params.Get("level")
	modelRunHour := params.Get("modelrunhour")
	forecasthour := params.Get("forecasthour")
	date := params.Get("date")

	var varType, levType string

	if level == "high" {
		varType = "var_HCDC"
		levType = "lev_high_cloud_layer"
	} else if level == "middle" {
		varType = "var_MCDC"
		levType = "lev_middle_cloud_layer"
	} else if level == "low" {
		varType = "var_LCDC"
		levType = "lev_low_cloud_layer"
	} else {
		http.Error(w, "Invalid level parameter", http.StatusBadRequest)
		return
	}

	if date == "" {
		date = time.Now().Format("20060102")
	}
	if modelRunHour == "" {
		modelRunHour = "00"
	}
	if forecasthour == "" {
		forecasthour = "000"
	}

	url := fmt.Sprintf("https://nomads.ncep.noaa.gov/cgi-bin/filter_gfs_0p25_1hr.pl?dir=%%2Fgfs.%s%%2F%s%%2Fatmos&file=gfs.t%sz.pgrb2.0p25.f%s&%s=on&%s=on&subregion=&toplat=90&leftlon=0&rightlon=360&bottomlat=-90", date, modelRunHour, modelRunHour, forecasthour, varType, levType)
	log.Println("URL is: ", url)

	res, err := http.Get(url)
	if err != nil {
		log.Println("Error getting data:", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	log.Println("Response status code:", res.StatusCode)
	if res.StatusCode != 200 {
		log.Println("Non-OK HTTP status:", res.Status)
		bodyBytes, _ := ioutil.ReadAll(res.Body)
		log.Println("Response body:", string(bodyBytes))
		http.Error(w, "Server returned non-OK status", http.StatusInternalServerError)
		return
	}
	defer res.Body.Close()
	log.Println("Data downloaded")

	data, err := ioutil.ReadAll(res.Body)
	if err != nil {
		log.Println("Error reading data:", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	log.Println("Data size:", len(data))
	log.Println("First 10 bytes of data:", data[:10])

	gribs, err := grib2.Read(data)
	if err != nil {
		log.Println("Error reading GRIB2 data:", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if len(gribs) == 0 {
		log.Println("No GRIB2 files found")
		http.Error(w, "No GRIB2 files found", http.StatusInternalServerError)
		return
	}

	firstGrib := gribs[0]

	var encodedRuns [][2]int
	var currentValue int
	var currentCount int

	for _, v := range firstGrib.Values {
		intValue := int(v.Value)

		if len(encodedRuns) == 0 || intValue != currentValue {
			if currentCount > 0 {
				encodedRuns = append(encodedRuns, [2]int{currentCount, currentValue})
			}
			currentValue = intValue
			currentCount = 1
		} else {
			currentCount++
		}
	}

	if currentCount > 0 {
		encodedRuns = append(encodedRuns, [2]int{currentCount, currentValue})
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(encodedRuns); err != nil {
		log.Fatalln("error writing values to json:", err)
	}
}