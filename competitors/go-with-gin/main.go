package main

import (
	"database/sql"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/lib/pq"
)

type World struct {
	Id           int `json:"id"`
	RandomNumber int `json:"randomNumber"`
}

func main() {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://postgres:benchmark@postgres-service:5432/benchmark?sslmode=disable"
	}

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// Optimize connection pool
	db.SetMaxOpenConns(100)
	db.SetMaxIdleConns(100)

	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(gin.Recovery())

	r.GET("/plaintext", func(c *gin.Context) {
		c.String(http.StatusOK, "Hello World!")
	})

	r.GET("/json", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "Hello World!"})
	})

	r.GET("/database/single-read", func(c *gin.Context) {
		idStr := c.DefaultQuery("id", "1")
		id, _ := strconv.Atoi(idStr)

		var w World
		err := db.QueryRow("SELECT id, randomnumber FROM World WHERE id = $1", id).Scan(&w.Id, &w.RandomNumber)
		if err != nil {
			c.Status(http.StatusInternalServerError)
			return
		}
		c.JSON(http.StatusOK, w)
	})

	r.GET("/database/multiple-read", func(c *gin.Context) {
		limitStr := c.DefaultQuery("limit", "20")
		offsetStr := c.DefaultQuery("offset", "0")
		limit, _ := strconv.Atoi(limitStr)
		offset, _ := strconv.Atoi(offsetStr)

		rows, err := db.Query("SELECT id, randomnumber FROM World LIMIT $1 OFFSET $2", limit, offset)
		if err != nil {
			c.Status(http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		worlds := []World{}
		for rows.Next() {
			var w World
			if err := rows.Scan(&w.Id, &w.RandomNumber); err != nil {
				c.Status(http.StatusInternalServerError)
				return
			}
			worlds = append(worlds, w)
		}
		c.JSON(http.StatusOK, worlds)
	})

	r.GET("/database/single-write", func(c *gin.Context) {
		idStr := c.DefaultQuery("id", "1")
		rnStr := c.DefaultQuery("randomNumber", "1")
		id, _ := strconv.Atoi(idStr)
		rn, _ := strconv.Atoi(rnStr)

		_, err := db.Exec("UPDATE World SET randomnumber = $1 WHERE id = $2", rn, id)
		if err != nil {
			c.Status(http.StatusInternalServerError)
			return
		}

		c.JSON(http.StatusOK, World{Id: id, RandomNumber: rn})
	})

	r.GET("/database/multiple-write", func(c *gin.Context) {
		limitStr := c.DefaultQuery("limit", "20")
		offsetStr := c.DefaultQuery("offset", "0")
		limit, _ := strconv.Atoi(limitStr)
		offset, _ := strconv.Atoi(offsetStr)

		rParam := c.Query("r")
		rVals := strings.Split(rParam, ",")

		rows, err := db.Query("SELECT id FROM World LIMIT $1 OFFSET $2", limit, offset)
		if err != nil {
			c.Status(http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		ids := []int{}
		for rows.Next() {
			var id int
			if err := rows.Scan(&id); err != nil {
				c.Status(http.StatusInternalServerError)
				return
			}
			ids = append(ids, id)
		}

		worlds := make([]World, len(ids))
		rns := make([]int, len(ids))
		for i, id := range ids {
			rn := 1
			if i < len(rVals) {
				rn, _ = strconv.Atoi(rVals[i])
			}
			worlds[i] = World{Id: id, RandomNumber: rn}
			rns[i] = rn
		}

		// Batch update using unnest
		_, err = db.Exec("UPDATE World SET randomnumber = u.rn FROM unnest($1::int[], $2::int[]) AS u(id, rn) WHERE World.id = u.id",
			pq.Array(ids), pq.Array(rns))
		if err != nil {
			log.Printf("Batch update error: %v", err)
			c.Status(http.StatusInternalServerError)
			return
		}

		c.JSON(http.StatusOK, worlds)
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}
	r.Run(":" + port)
}
