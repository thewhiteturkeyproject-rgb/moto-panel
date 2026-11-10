C=/sys/devices/system/cpu
echo "bat=$(cat /sys/class/power_supply/battery/capacity)"
echo "temp=$(cat /sys/class/power_supply/battery/temp)"
echo "gov=$(cat $C/cpu0/cpufreq/scaling_governor)"
echo "govs=$(cat $C/cpu0/cpufreq/scaling_available_governors)"
for f in $C/cpu*/cpufreq/scaling_cur_freq; do echo "freq=$(cat $f)"; done
