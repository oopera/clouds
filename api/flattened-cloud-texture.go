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
	level_mb := params.Get("level_mb")
	date := params.Get("date")
	if date == "" {
		date = time.Now().Format("20060102")
	}
	url := fmt.Sprintf("https://nomads.ncep.noaa.gov/cgi-bin/filter_gfs_0p25_1hr.pl?dir=%%2Fgfs.%s%%2F00%%2Fatmos&file=gfs.t00z.pgrb2.0p25.f000&var_TCDC=on&lev_%s=on&subregion=&toplat=90&leftlon=0&rightlon=360&bottomlat=-90", date, level_mb)
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
	log.Printf("Source package contains %d GRIB2 file(s)\n", len(gribs))

	var flattenedArray []int

	for _, g := range gribs {
		log.Printf("Published='%s', Forecast='%s', Parameter='%s', Unit='%s', Description='%s'\n",
			g.RefTime.Format("2006-01-02 15:04:05"), g.VerfTime.Format("2006-01-02 15:04:05"), g.Name, g.Unit, g.Description)

		for _, v := range g.Values {
			intValue := int(v.Value)
			flattenedArray = append(flattenedArray, intValue)
		}
	}

	// Output the array in JSON format
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(flattenedArray); err != nil {
		log.Fatalln("error writing values to json:", err)
	}
}