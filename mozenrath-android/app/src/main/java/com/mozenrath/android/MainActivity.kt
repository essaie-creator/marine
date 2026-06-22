package com.mozenrath.app

import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.media.MediaPlayer
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.chip.Chip
import kotlinx.coroutines.*
import java.io.File
import java.text.SimpleDateFormat
import java.util.*

class MainActivity : AppCompatActivity() {

    // UI Components
    private lateinit var urlInput: EditText
    private lateinit var processButton: Button
    private lateinit var statusText: TextView
    private lateinit var progressBar: ProgressBar
    private lateinit var presetsScroll: HorizontalScrollView
    private lateinit var effectsLayout: LinearLayout
    private lateinit var playerLayout: LinearLayout
    private lateinit var historyLayout: LinearLayout
    
    // Effect Controls
    private lateinit var reverbSeekbar: SeekBar
    private lateinit var bassSeekbar: SeekBar
    private lateinit var vinylSeekbar: SeekBar
    private lateinit var speedSeekbar: SeekBar
    private lateinit var reverbValue: TextView
    private lateinit var bassValue: TextView
    private lateinit var vinylValue: TextView
    private lateinit var speedValue: TextView
    private lateinit var applyEffectsButton: Button
    
    // Preset Chips
    private lateinit var presetLofi: Chip
    private lateinit var presetNightcore: Chip
    private lateinit var presetCosmic: Chip
    private lateinit var presetVinyl: Chip
    private lateinit var presetReset: Chip
    
    // Player Components
    private lateinit var playPauseButton: ImageButton
    private lateinit var playerSeekbar: SeekBar
    private lateinit var playerTime: TextView
    private lateinit var shareButton: Button
    private lateinit var exportButton: Button
    private lateinit var playerStatus: TextView
    
    // ExoPlayer
    private var exoPlayer: ExoPlayer? = null
    private var currentAudioFile: File? = null
    private val handler = Handler(Looper.getMainLooper())
    private var isPlaying = false
    
    // Processing State
    private val PROCESSING_REQUEST_CODE = 1001
    private var isProcessing = false
    
    // Broadcast Receiver for Service Updates
    private val serviceReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            when (intent?.action) {
                AudioProcessingService.ACTION_PROGRESS -> {
                    val progress = intent.getIntExtra(AudioProcessingService.EXTRA_PROGRESS, 0)
                    val status = intent.getStringExtra(AudioProcessingService.EXTRA_STATUS) ?: ""
                    updateProgress(progress, status)
                }
                AudioProcessingService.ACTION_COMPLETE -> {
                    val filePath = intent.getStringExtra(AudioProcessingService.EXTRA_FILE_PATH)
                    processingComplete(filePath)
                }
                AudioProcessingService.ACTION_ERROR -> {
                    val error = intent.getStringExtra(AudioProcessingService.EXTRA_ERROR) ?: "Unknown error"
                    processingError(error)
                }
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        
        // Initialize UI components
        initViews()
        
        // Setup listeners
        setupListeners()
        
        // Setup preset chips
        setupPresets()
        
        // Check permissions
        if (!checkPermissions()) {
            requestPermissions()
        }
        
        // Register broadcast receiver
        val filter = IntentFilter().apply {
            addAction(AudioProcessingService.ACTION_PROGRESS)
            addAction(AudioProcessingService.ACTION_COMPLETE)
            addAction(AudioProcessingService.ACTION_ERROR)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(serviceReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(serviceReceiver, filter)
        }
    }
    
    private fun initViews() {
        urlInput = findViewById(R.id.urlInput)
        processButton = findViewById(R.id.processButton)
        statusText = findViewById(R.id.statusText)
        progressBar = findViewById(R.id.progressBar)
        presetsScroll = findViewById(R.id.presetsScroll)
        effectsLayout = findViewById(R.id.effectsLayout)
        playerLayout = findViewById(R.id.playerLayout)
        historyLayout = findViewById(R.id.historyLayout)
        
        // Effect controls
        reverbSeekbar = findViewById(R.id.reverbSeekbar)
        bassSeekbar = findViewById(R.id.bassSeekbar)
        vinylSeekbar = findViewById(R.id.vinylSeekbar)
        speedSeekbar = findViewById(R.id.speedSeekbar)
        reverbValue = findViewById(R.id.reverbValue)
        bassValue = findViewById(R.id.bassValue)
        vinylValue = findViewById(R.id.vinylValue)
        speedValue = findViewById(R.id.speedValue)
        applyEffectsButton = findViewById(R.id.applyEffectsButton)
        
        // Preset chips
        presetLofi = findViewById(R.id.presetLofi)
        presetNightcore = findViewById(R.id.presetNightcore)
        presetCosmic = findViewById(R.id.presetCosmic)
        presetVinyl = findViewById(R.id.presetVinyl)
        presetReset = findViewById(R.id.presetReset)
        
        // Player components
        playPauseButton = findViewById(R.id.playPauseButton)
        playerSeekbar = findViewById(R.id.playerSeekbar)
        playerTime = findViewById(R.id.playerTime)
        shareButton = findViewById(R.id.shareButton)
        exportButton = findViewById(R.id.exportButton)
        playerStatus = findViewById(R.id.playerStatus)
        
        // Initialize seekbar values
        updateSeekBarValues()
    }
    
    private fun setupListeners() {
        // Process button
        processButton.setOnClickListener {
            val url = urlInput.text.toString().trim()
            if (url.isNotEmpty()) {
                startProcessing(url)
            } else {
                Toast.makeText(this, "Please enter a URL", Toast.LENGTH_SHORT).show()
            }
        }
        
        // Seekbar listeners with value updates
        reverbSeekbar.setOnSeekBarChangeListener(createSeekBarListener(reverbValue) { "%d%" })
        bassSeekbar.setOnSeekBarChangeListener(createSeekBarListener(bassValue) { "%d%" })
        vinylSeekbar.setOnSeekBarChangeListener(createSeekBarListener(vinylValue) { "%d%" })
        speedSeekbar.setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
            override fun onProgressChanged(seekBar: SeekBar?, progress: Int, fromUser: Boolean) {
                val speed = 0.5f + (progress / 100f)
                speedValue.text = String.format("%.1fx", speed)
            }
            override fun onStartTrackingTouch(seekBar: SeekBar?) {}
            override fun onStopTrackingTouch(seekBar: SeekBar?) {}
        })
        
        // Apply Effects button
        applyEffectsButton.setOnClickListener {
            currentAudioFile?.let { file ->
                applyEffectsToFile(file)
            }
        }
        
        // Play/Pause button
        playPauseButton.setOnClickListener {
            togglePlayback()
        }
        
        // Player seekbar
        playerSeekbar.setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
            override fun onProgressChanged(seekBar: SeekBar?, progress: Int, fromUser: Boolean) {
                if (fromUser && exoPlayer != null) {
                    exoPlayer?.seekTo(progress.toLong())
                }
            }
            override fun onStartTrackingTouch(seekBar: SeekBar?) {}
            override fun onStopTrackingTouch(seekBar: SeekBar?) {}
        })
        
        // Share button
        shareButton.setOnClickListener {
            currentAudioFile?.let { shareFile(it) }
        }
        
        // Export button
        exportButton.setOnClickListener {
            currentAudioFile?.let { exportFile(it) }
        }
    }
    
    private fun createSeekBarListener(
        valueTextView: TextView,
        formatText: (Int) -> String
    ): SeekBar.OnSeekBarChangeListener {
        return object : SeekBar.OnSeekBarChangeListener {
            override fun onProgressChanged(seekBar: SeekBar?, progress: Int, fromUser: Boolean) {
                valueTextView.text = formatText(progress)
            }
            override fun onStartTrackingTouch(seekBar: SeekBar?) {}
            override fun onStopTrackingTouch(seekBar: SeekBar?) {}
        }
    }
    
    private fun setupPresets() {
        presetLofi.setOnClickListener {
            applyPreset(Preset.LOFI)
        }
        presetNightcore.setOnClickListener {
            applyPreset(Preset.NIGHTCORE)
        }
        presetCosmic.setOnClickListener {
            applyPreset(Preset.COSMIC)
        }
        presetVinyl.setOnClickListener {
            applyPreset(Preset.VINYL)
        }
        presetReset.setOnClickListener {
            resetPresets()
        }
    }
    
    private fun applyPreset(preset: Preset) {
        when (preset) {
            Preset.LOFI -> {
                reverbSeekbar.progress = 40
                bassSeekbar.progress = 30
                vinylSeekbar.progress = 25
                speedSeekbar.progress = 45 // 0.95x
            }
            Preset.NIGHTCORE -> {
                reverbSeekbar.progress = 20
                bassSeekbar.progress = 10
                vinylSeekbar.progress = 0
                speedSeekbar.progress = 75 // 1.25x
            }
            Preset.COSMIC -> {
                reverbSeekbar.progress = 80
                bassSeekbar.progress = 40
                vinylSeekbar.progress = 0
                speedSeekbar.progress = 50 // 1.0x
            }
            Preset.VINYL -> {
                reverbSeekbar.progress = 30
                bassSeekbar.progress = 20
                vinylSeekbar.progress = 50
                speedSeekbar.progress = 48 // ~0.98x
            }
        }
        updateSeekBarValues()
        Toast.makeText(this, "${preset.name} preset applied", Toast.LENGTH_SHORT).show()
    }
    
    private fun resetPresets() {
        reverbSeekbar.progress = 30
        bassSeekbar.progress = 20
        vinylSeekbar.progress = 0
        speedSeekbar.progress = 50
        updateSeekBarValues()
        Toast.makeText(this, "Effects reset", Toast.LENGTH_SHORT).show()
    }
    
    private fun updateSeekBarValues() {
        reverbValue.text = "${reverbSeekbar.progress}%"
        bassValue.text = "${bassSeekbar.progress}%"
        vinylValue.text = "${vinylSeekbar.progress}%"
        val speed = 0.5f + (speedSeekbar.progress / 100f)
        speedValue.text = String.format("%.1fx", speed)
    }
    
    private fun checkPermissions(): Boolean {
        val permissions = mutableListOf(
            Manifest.permission.INTERNET,
            Manifest.permission.ACCESS_NETWORK_STATE
        )
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(Manifest.permission.POST_NOTIFICATIONS)
            permissions.add(Manifest.permission.READ_MEDIA_AUDIO)
        } else {
            permissions.add(Manifest.permission.READ_EXTERNAL_STORAGE)
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
                permissions.add(Manifest.permission.WRITE_EXTERNAL_STORAGE)
            }
        }
        
        return permissions.all {
            ContextCompat.checkSelfPermission(this, it) == PackageManager.PERMISSION_GRANTED
        }
    }
    
    private fun requestPermissions() {
        val permissions = mutableListOf(
            Manifest.permission.INTERNET,
            Manifest.permission.ACCESS_NETWORK_STATE
        )
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(Manifest.permission.POST_NOTIFICATIONS)
            permissions.add(Manifest.permission.READ_MEDIA_AUDIO)
        } else {
            permissions.add(Manifest.permission.READ_EXTERNAL_STORAGE)
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
                permissions.add(Manifest.permission.WRITE_EXTERNAL_STORAGE)
            }
        }
        
        ActivityCompat.requestPermissions(
            this,
            permissions.toTypedArray(),
            PROCESSING_REQUEST_CODE
        )
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
        if (isProcessing) {
            Toast.makeText(this, "Already processing a track", Toast.LENGTH_SHORT).show()
            return
        }
        
        isProcessing = true
        processButton.isEnabled = false
        progressBar.visibility = View.VISIBLE
        progressBar.progress = 0
        statusText.text = "Starting download..."
        effectsLayout.visibility = View.GONE
        playerLayout.visibility = View.GONE
        
        // Stop any existing playback
        stopPlayback()
        
        // Start background service
        val intent = Intent(this, AudioProcessingService::class.java).apply {
            action = AudioProcessingService.ACTION_PROCESS_URL
            putExtra(AudioProcessingService.EXTRA_URL, url)
            
            // Pass effect parameters
            putExtra(AudioProcessingService.EXTRA_REVERB, reverbSeekbar.progress)
            putExtra(AudioProcessingService.EXTRA_BASS, bassSeekbar.progress)
            putExtra(AudioProcessingService.EXTRA_VINYL, vinylSeekbar.progress)
            putExtra(AudioProcessingService.EXTRA_SPEED, speedSeekbar.progress)
        }
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent)
        } else {
            startService(intent)
        }
    }
    
    private fun updateProgress(progress: Int, status: String) {
        progressBar.progress = progress
        statusText.text = status
    }
    
    private fun processingComplete(filePath: String?) {
        isProcessing = false
        processButton.isEnabled = true
        progressBar.visibility = View.GONE
        
        if (filePath != null) {
            currentAudioFile = File(filePath)
            statusText.text = "Processing complete!"
            effectsLayout.visibility = View.VISIBLE
            playerLayout.visibility = View.VISIBLE
            presetsScroll.visibility = View.VISIBLE
            
            // Show success message
            Toast.makeText(this, "Track processed successfully!", Toast.LENGTH_LONG).show()
            
            // Initialize player
            initializePlayer(currentAudioFile!!)
            
            // Update history (would implement RecyclerView adapter here)
            historyLayout.visibility = View.VISIBLE
        } else {
            statusText.text = "Processing failed - no output file"
        }
    }
    
    private fun processingError(error: String) {
        isProcessing = false
        processButton.isEnabled = true
        progressBar.visibility = View.GONE
        statusText.text = "Error: $error"
        
        Toast.makeText(this, "Processing failed: $error", Toast.LENGTH_LONG).show()
    }
    
    private fun initializePlayer(file: File) {
        try {
            exoPlayer = ExoPlayer.Builder(this).build().also { player ->
                val mediaItem = MediaItem.fromUri(Uri.fromFile(file))
                player.setMediaItem(mediaItem)
                player.prepare()
                
                player.addListener(object : Player.Listener {
                    override fun onPlaybackStateChanged(state: Int) {
                        when (state) {
                            Player.STATE_ENDED -> {
                                isPlaying = false
                                playPauseButton.setImageResource(android.R.drawable.ic_media_play)
                                playerSeekbar.progress = 0
                            }
                            Player.STATE_READY -> {
                                playerSeekbar.max = player.duration.toInt()
                            }
                        }
                    }
                    
                    override fun onIsPlayingChanged(isCurrentlyPlaying: Boolean) {
                        isPlaying = isCurrentlyPlaying
                        playPauseButton.setImageResource(
                            if (isPlaying) android.R.drawable.ic_media_pause
                            else android.R.drawable.ic_media_play
                        )
                    }
                })
                
                // Update seekbar during playback
                handler.postDelayed(object : Runnable {
                    override fun run() {
                        if (exoPlayer != null && isPlaying) {
                            playerSeekbar.progress = exoPlayer!!.currentPosition.toInt()
                            playerTime.text = formatTime(exoPlayer!!.currentPosition)
                            handler.postDelayed(this, 1000)
                        }
                    }
                }, 1000)
            }
            
            playerStatus.text = "Ready to play"
        } catch (e: Exception) {
            playerStatus.text = "Error loading audio: ${e.message}"
            e.printStackTrace()
        }
    }
    
    private fun togglePlayback() {
        exoPlayer?.let { player ->
            if (isPlaying) {
                player.pause()
            } else {
                player.play()
            }
        }
    }
    
    private fun stopPlayback() {
        exoPlayer?.let { player ->
            player.pause()
            player.stop()
            player.release()
            exoPlayer = null
        }
        isPlaying = false
        handler.removeCallbacksAndMessages(null)
    }
    
    private fun applyEffectsToFile(file: File) {
        // Re-process the file with new effects
        Toast.makeText(this, "Applying effects...", Toast.LENGTH_SHORT).show()
        
        val intent = Intent(this, AudioProcessingService::class.java).apply {
            action = AudioProcessingService.ACTION_APPLY_EFFECTS
            putExtra(AudioProcessingService.EXTRA_INPUT_FILE, file.absolutePath)
            putExtra(AudioProcessingService.EXTRA_REVERB, reverbSeekbar.progress)
            putExtra(AudioProcessingService.EXTRA_BASS, bassSeekbar.progress)
            putExtra(AudioProcessingService.EXTRA_VINYL, vinylSeekbar.progress)
            putExtra(AudioProcessingService.EXTRA_SPEED, speedSeekbar.progress)
        }
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent)
        } else {
            startService(intent)
        }
    }
    
    private fun shareFile(file: File) {
        try {
            val uri = FileProvider.getUriForFile(
                this,
                "${packageName}.fileprovider",
                file
            )
            
            val shareIntent = Intent(Intent.ACTION_SEND).apply {
                type = "audio/*"
                putExtra(Intent.EXTRA_STREAM, uri)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            
            startActivity(Intent.createChooser(shareIntent, "Share audio file"))
        } catch (e: Exception) {
            Toast.makeText(this, "Failed to share: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }
    
    private fun exportFile(file: File) {
        try {
            val outputDir = getExternalFilesDir(null)?.let {
                File(it, "Music/Mozenrath")
            } ?: filesDir
            
            outputDir.mkdirs()
            
            val outputFile = File(outputDir, "mozenrath_${System.currentTimeMillis()}.mp3")
            file.copyTo(outputFile, overwrite = true)
            
            Toast.makeText(this, "Exported to: ${outputFile.absolutePath}", Toast.LENGTH_LONG).show()
            
            // Notify media scanner
            Intent(Intent.ACTION_MEDIA_SCANNER_SCAN_FILE).apply {
                data = Uri.fromFile(outputFile)
                sendBroadcast(this)
            }
        } catch (e: Exception) {
            Toast.makeText(this, "Export failed: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }
    
    private fun formatTime(ms: Long): String {
        val seconds = (ms / 1000) % 60
        val minutes = (ms / 1000) / 60
        return String.format("%d:%02d", minutes, seconds)
    }
    
    override fun onDestroy() {
        super.onDestroy()
        unregisterReceiver(serviceReceiver)
        stopPlayback()
    }
    
    override fun onPause() {
        super.onPause()
        exoPlayer?.pause()
    }
}

// Preset definitions
enum class Preset {
    LOFI, NIGHTCORE, COSMIC, VINYL
}
