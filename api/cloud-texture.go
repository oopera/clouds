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

type CloudData struct {
	LowCloud    [][2]int `json:"lowCloud"`
	MiddleCloud [][2]int `json:"middleCloud"`
	HighCloud   [][2]int `json:"highCloud"`
}

func getEncodedRun(url string) ([][2]int, error) {
	res, err := http.Get(url)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	if res.StatusCode != 200 {
		return nil, fmt.Errorf("Server returned non-OK status: %s", res.Status)
	}

	data, err := ioutil.ReadAll(res.Body)
	if err != nil {
		return nil, err
	}

	gribs, err := grib2.Read(data)
	if err != nil {
		return nil, err
	}

	var encodedRuns [][2]int
	for _, g := range gribs {
		var currentValue int
		var currentCount int

		for _, v := range g.Values {
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
	}

	return encodedRuns, nil
}

func Handler(w http.ResponseWriter, r *http.Request) {
	defer func() {
		if r := recover(); r != nil {
			log.Println("Recovered from panic:", r)
			http.Error(w, "Server error", http.StatusInternalServerError)
		}
	}()
	
	params := r.URL.Query()
	date := params.Get("date")
	if date == "" {
		date = time.Now().Format("20060102")
	}
	hour := "00"

	lowCloudURL := fmt.Sprintf("https://nomads.ncep.noaa.gov/cgi-bin/filter_gfs_0p25_1hr.pl?dir=%%2Fgfs.%s%%2F%s%%2Fatmos&file=gfs.t%sz.pgrb2.0p25.f000&var_LCDC=on&lev_low_cloud_layer=on&subregion=&toplat=90&leftlon=0&rightlon=360&bottomlat=-90", date, hour, hour)
	middleCloudURL := fmt.Sprintf("https://nomads.ncep.noaa.gov/cgi-bin/filter_gfs_0p25_1hr.pl?dir=%%2Fgfs.%s%%2F%s%%2Fatmos&file=gfs.t%sz.pgrb2.0p25.f000&var_MCDC=on&lev_middle_cloud_layer=on&subregion=&toplat=90&leftlon=0&rightlon=360&bottomlat=-90", date, hour, hour)
	highCloudURL := fmt.Sprintf("https://nomads.ncep.noaa.gov/cgi-bin/filter_gfs_0p25_1hr.pl?dir=%%2Fgfs.%s%%2F%s%%2Fatmos&file=gfs.t%sz.pgrb2.0p25.f000&var_HCDC=on&lev_high_cloud_layer=on&subregion=&toplat=90&leftlon=0&rightlon=360&bottomlat=-90", date, hour, hour)

	lowCloudData, err := getEncodedRun(lowCloudURL)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	middleCloudData, err := getEncodedRun(middleCloudURL)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	highCloudData, err := getEncodedRun(highCloudURL)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	cloudData := CloudData{
		LowCloud:    lowCloudData,
		MiddleCloud: middleCloudData,
		HighCloud:   highCloudData,
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(cloudData); err != nil {
		log.Fatalln("error writing values to json:", err)
	}
}