package com.mozenrath.android

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.View
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import kotlinx.coroutines.*
import java.io.File

class MainActivity : AppCompatActivity() {

    private lateinit var urlInput: EditText
    private lateinit var processButton: Button
    private lateinit var statusText: TextView
    private lateinit var progressBar: ProgressBar
    private lateinit var effectsLayout: LinearLayout
    
    private val PROCESSING_REQUEST_CODE = 1001
    private val REQUIRED_PERMISSIONS = arrayOf(
        Manifest.permission.INTERNET,
        Manifest.permission.WRITE_EXTERNAL_STORAGE,
        Manifest.permission.READ_EXTERNAL_STORAGE
    )

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        
        // Initialize UI components
        urlInput = findViewById(R.id.urlInput)
        processButton = findViewById(R.id.processButton)
        statusText = findViewById(R.id.statusText)
        progressBar = findViewById(R.id.progressBar)
        effectsLayout = findViewById(R.id.effectsLayout)
        
        // Check permissions
        if (!checkPermissions()) {
            requestPermissions()
        }
        
        // Set up process button click listener
        processButton.setOnClickListener {
            val url = urlInput.text.toString().trim()
            if (url.isNotEmpty()) {
                startProcessing(url)
            } else {
                Toast.makeText(this, "Please enter a URL", Toast.LENGTH_SHORT).show()
            }
        }
    }
    
    private fun checkPermissions(): Boolean {
        return REQUIRED_PERMISSIONS.all {
            ContextCompat.checkSelfPermission(this, it) == PackageManager.PERMISSION_GRANTED
        }
    }
    
    private fun requestPermissions() {
        ActivityCompat.requestPermissions(this, REQUIRED_PERMISSIONS, PROCESSING_REQUEST_CODE)
    }
    
    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == PROCESSING_REQUEST_CODE) {
            if (grantResults.any { it != PackageManager.PERMISSION_GRANTED }) {
                Toast.makeText(this, "Permissions required for audio processing", Toast.LENGTH_LONG).show()
            }
        }
    }
    
    private fun startProcessing(url: String) {
        // Show progress UI
        processButton.isEnabled = false
        progressBar.visibility = View.VISIBLE
        statusText.text = "Downloading audio..."
        effectsLayout.visibility = View.GONE
        
        // Start background service for processing
        val intent = Intent(this, AudioProcessingService::class.java).apply {
            action = AudioProcessingService.ACTION_PROCESS_URL
            putExtra(AudioProcessingService.EXTRA_URL, url)
        }
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent)
        } else {
            startService(intent)
        }
        
        // Monitor progress (simplified - in real app would use BroadcastReceiver)
        CoroutineScope(Dispatchers.Main).launch {
            delay(1000)
            statusText.text = "Processing... This may take 2-5 minutes"
            
            // Simulate progress updates
            for (i in 1..100) {
                progressBar.progress = i
                delay(200) // Simulated progress
            }
            
            statusText.text = "Complete! Check your Music/Mozenrath folder"
            processButton.isEnabled = true
            effectsLayout.visibility = View.VISIBLE
        }
    }
}
