# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /sdk/tools/proguard/proguard-android.txt

# Keep ONNX Runtime classes
-keep class com.microsoft.onnxruntime.** { *; }

# Keep audio processing classes
-keep class com.mozenrath.android.** { *; }

# Standard Android optimizations
-dontoptimize
-dontobfuscate
